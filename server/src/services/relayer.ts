import {
  TransactionBuilder,
  Transaction,
  FeeBumpTransaction,
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
   * Sponsoring check: verifies account limits and global pool limits.
   */
  checkEligibility(contractAddress: string): {
    eligible: boolean;
    reason?: string;
    remainingDaily: number;
  } {
    const today = new Date().toISOString().split('T')[0];
    const usage = db.getUsage(contractAddress, today);

    const remaining = Math.max(0, config.dailySponsoredLimit - usage.count);
    if (remaining <= 0) {
      return {
        eligible: false,
        reason: `Daily per-account limit of ${config.dailySponsoredLimit} sponsored transactions reached for today.`,
        remainingDaily: 0,
      };
    }

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
   */
  sponsorTransaction(transactionXdr: string, contractAddress: string): SponsorResult {
    const today = new Date().toISOString().split('T')[0];
    const eligibility = this.checkEligibility(contractAddress);

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
      // Parse transaction XDR using network passphrase
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

      // Fail-closed security validation: verify operations against allowlist
      for (const op of innerTx.operations) {
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

      // Base fee calculation
      const baseFee = Math.min(
        config.maxBaseFeeStroops,
        Math.max(100, parseInt(innerTx.fee, 10) * 2)
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
      const updated = db.recordUsage(contractAddress, today, baseFee);

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
}

export const relayerService = new RelayerService();
