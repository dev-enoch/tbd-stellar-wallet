import {
  TransactionBuilder,
  Transaction,
  FeeBumpTransaction,
  Operation,
  Account,
  Address,
  xdr,
} from '@stellar/stellar-sdk';
import { config } from '../config';
import { db } from '../db';

export interface SponsorResult {
  success: boolean;
  sponsoredXdr?: string;
  error?: string;
  remainingDaily: number;
  dailyLimit: number;
  feeStroops: number;
}

export class RelayerService {
  /**
   * Sponsoring check: verifies account limits, IP rate limits, and global pool limits.
   */
  checkEligibility(
    contractAddress: string,
    clientIp?: string
  ): {
    eligible: boolean;
    reason?: string;
    remainingDaily: number;
  } {
    const today = new Date().toISOString().split('T')[0];

    // 1. IP-level anti-drain limit (prevents creating 1000 accounts to burn the 10 XLM pool)
    if (clientIp) {
      const ipCount = db.getIpUsage(clientIp, today);
      if (ipCount >= config.dailyIpSponsoredLimit) {
        return {
          eligible: false,
          reason: `Daily IP rate limit of ${config.dailyIpSponsoredLimit} requests exceeded. Anti-drain policy active.`,
          remainingDaily: 0,
        };
      }
    }

    // 2. Per-account limit (5/day)
    const usage = db.getUsage(contractAddress, today);
    const remaining = Math.max(0, config.dailySponsoredLimit - usage.count);
    if (remaining <= 0) {
      return {
        eligible: false,
        reason: `Daily per-account limit of ${config.dailySponsoredLimit} sponsored transactions reached for today.`,
        remainingDaily: 0,
      };
    }

    // 3. Global budget pool limit (10 XLM / day)
    const globalBudgetUsed = db.getGlobalDailyBudgetUsed(today);
    if (globalBudgetUsed >= config.dailyGlobalBudgetStroops) {
      return {
        eligible: false,
        reason: `Daily global sponsorship budget cap reached. Please self-pay transaction fees.`,
        remainingDaily: remaining,
      };
    }

    return {
      eligible: true,
      remainingDaily: remaining,
    };
  }

  /**
   * Evaluates, validates, and sponsors a transaction by wrapping it in a fee-bump.
   * Includes strict anti-theft protections against draining the relayer.
   */
  sponsorTransaction(
    transactionXdr: string,
    contractAddress: string,
    clientIp?: string
  ): SponsorResult {
    const today = new Date().toISOString().split('T')[0];
    const eligibility = this.checkEligibility(contractAddress, clientIp);

    if (!eligibility.eligible) {
      return {
        success: false,
        error: eligibility.reason,
        remainingDaily: eligibility.remainingDaily,
        dailyLimit: config.dailySponsoredLimit,
        feeStroops: 0,
      };
    }

    try {
      const genericTx = TransactionBuilder.fromXDR(transactionXdr, config.networkPassphrase);

      if (!(genericTx instanceof Transaction)) {
        return {
          success: false,
          error: 'Only standard Stellar Transactions can be wrapped into FeeBumpTransactions.',
          remainingDaily: eligibility.remainingDaily,
          dailyLimit: config.dailySponsoredLimit,
          feeStroops: 0,
        };
      }

      const innerTx = genericTx;
      const relayerPubkey = config.relayerKeypair.publicKey();

      // ANTI-THEFT CHECK 1: The inner transaction source MUST NOT be the relayer account!
      if (innerTx.source === relayerPubkey) {
        return {
          success: false,
          error: 'Security violation: Inner transaction source cannot be the relayer account.',
          remainingDaily: eligibility.remainingDaily,
          dailyLimit: config.dailySponsoredLimit,
          feeStroops: 0,
        };
      }

      // ANTI-THEFT CHECK 2: No operation inside the transaction may use the relayer as its source!
      for (const op of innerTx.operations) {
        if (op.source === relayerPubkey) {
          return {
            success: false,
            error: `Security violation: Operation type '${op.type}' attempts to debit or use relayer as source.`,
            remainingDaily: eligibility.remainingDaily,
            dailyLimit: config.dailySponsoredLimit,
            feeStroops: 0,
          };
        }

        // Allowlist check
        if (!config.allowedOperations.includes(op.type)) {
          return {
            success: false,
            error: `Disallowed operation type '${op.type}' cannot be sponsored by the relayer.`,
            remainingDaily: eligibility.remainingDaily,
            dailyLimit: config.dailySponsoredLimit,
            feeStroops: 0,
          };
        }
      }

      // ANTI-DRAIN CHECK 3: Fee Hard Caps
      const requestedFee = parseInt(innerTx.fee, 10);
      if (requestedFee > config.maxBaseFeeStroops) {
        return {
          success: false,
          error: `Base fee ${requestedFee} stroops exceeds maximum sponsored cap of ${config.maxBaseFeeStroops} stroops.`,
          remainingDaily: eligibility.remainingDaily,
          dailyLimit: config.dailySponsoredLimit,
          feeStroops: 0,
        };
      }

      const baseFee = Math.min(
        config.maxBaseFeeStroops,
        Math.max(100, requestedFee * 2)
      );

      // Build FeeBumpTransaction
      const feeBumpTx: FeeBumpTransaction = TransactionBuilder.buildFeeBumpTransaction(
        config.relayerKeypair,
        baseFee.toString(),
        innerTx,
        config.networkPassphrase
      );

      // Sign with relayer secret key
      feeBumpTx.sign(config.relayerKeypair);

      // Record sponsored usage in database
      const updated = db.recordUsage(contractAddress, today, baseFee, clientIp);

      return {
        success: true,
        sponsoredXdr: feeBumpTx.toXDR(),
        remainingDaily: Math.max(0, config.dailySponsoredLimit - updated.count),
        dailyLimit: config.dailySponsoredLimit,
        feeStroops: baseFee,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Relayer failed to parse or sponsor transaction: ${err.message}`,
        remainingDaily: eligibility.remainingDaily,
        dailyLimit: config.dailySponsoredLimit,
        feeStroops: 0,
      };
    }
  }

  /**
   * Dedicated Soroban Smart Account Invocation Relay (PRD Section 8).
   * Because a contract address (C...) CANNOT be a transaction source account,
   * the relayer acts as the outer transaction source and fee payer, while the
   * user authorizes the contract action with their secp256r1 passkey authorization entry.
   * Enables a brand new passkey smart account with zero native XLM to transact.
   */
  async relaySmartAccountInvocation(params: {
    contractAddress: string;
    authEntries?: any[];
    functionName: string;
    clientIp?: string;
  }): Promise<{
    success: boolean;
    txHash?: string;
    sponsoredXdr?: string;
    error?: string;
    remainingDaily: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const eligibility = this.checkEligibility(params.contractAddress, params.clientIp);

    if (!eligibility.eligible) {
      return {
        success: false,
        error: eligibility.reason,
        remainingDaily: eligibility.remainingDaily,
      };
    }

    try {
      const relayerAccount = new Account(config.relayerKeypair.publicKey(), '1000');

      const contractScAddress = new Address(params.contractAddress).toScAddress();
      const invokeArgs = new xdr.InvokeContractArgs({
        contractAddress: contractScAddress,
        functionName: params.functionName,
        args: [],
      });
      const hostFunction = xdr.HostFunction.hostFunctionTypeInvokeContract(invokeArgs);

      // Outer transaction source is the relayer Ed25519 account, funding network & Soroban resource fees
      const tx = new TransactionBuilder(relayerAccount, {
        fee: config.maxBaseFeeStroops.toString(),
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.invokeHostFunction({
            func: hostFunction,
            auth: params.authEntries || [],
          })
        )
        .setTimeout(30)
        .build();

      tx.sign(config.relayerKeypair);

      const fee = parseInt(tx.fee, 10);
      const updated = db.recordUsage(params.contractAddress, today, fee, params.clientIp);

      return {
        success: true,
        sponsoredXdr: tx.toXDR(),
        remainingDaily: Math.max(0, config.dailySponsoredLimit - updated.count),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        remainingDaily: eligibility.remainingDaily,
      };
    }
  }
}

export const relayerService = new RelayerService();
