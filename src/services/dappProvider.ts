import {
  TransactionBuilder,
  Transaction,
  FeeBumpTransaction,
  Keypair,
} from '@stellar/stellar-sdk';
import { NETWORKS, NetworkType, formatAddress } from './stellar';

export interface DecodedOperationSummary {
  type: string;
  leavesAccount?: string;
  arrivesAccount?: string;
  description: string;
  isHighRisk: boolean;
  riskWarning?: string;
}

export interface DecodedTransactionPreview {
  headline: string;
  whatLeaves: string[];
  whatArrives: string[];
  network: NetworkType;
  fee: string;
  operationsCount: number;
  operations: DecodedOperationSummary[];
  hasHighRisk: boolean;
  warnings: string[];
  rawXdr: string;
}

/**
 * Decodes a raw base64 XDR string and produces plain-language summaries and risk checks.
 */
export function decodeTransactionXdr(
  xdr: string,
  userPublicKey: string,
  network: NetworkType = 'testnet'
): DecodedTransactionPreview {
  const passphrase = NETWORKS[network].networkPassphrase;
  let tx: Transaction | FeeBumpTransaction;

  try {
    tx = TransactionBuilder.fromXDR(xdr, passphrase);
  } catch (err: any) {
    throw new Error(`Failed to decode transaction XDR: ${err.message || 'Invalid XDR'}`);
  }

  // Handle FeeBump if wrapped
  const innerTx: Transaction = tx instanceof FeeBumpTransaction ? tx.innerTransaction : tx;

  const whatLeaves: string[] = [];
  const whatArrives: string[] = [];
  const warnings: string[] = [];
  const decodedOps: DecodedOperationSummary[] = [];

  let hasHighRisk = false;

  for (const op of innerTx.operations) {
    const source = op.source || innerTx.source;
    const isUserSource = source === userPublicKey;

    if (op.type === 'payment') {
      const assetCode = op.asset.isNative() ? 'XLM' : op.asset.code;
      const amountStr = `${op.amount} ${assetCode}`;

      if (isUserSource) {
        whatLeaves.push(amountStr);
        decodedOps.push({
          type: 'Payment',
          leavesAccount: amountStr,
          description: `Send ${amountStr} to ${formatAddress(op.destination, 4)}`,
          isHighRisk: false,
        });
      } else if (op.destination === userPublicKey) {
        whatArrives.push(amountStr);
        decodedOps.push({
          type: 'Payment',
          arrivesAccount: amountStr,
          description: `Receive ${amountStr} from ${formatAddress(source, 4)}`,
          isHighRisk: false,
        });
      }
    } else if (op.type === 'createAccount') {
      if (isUserSource) {
        const amt = `${op.startingBalance} XLM`;
        whatLeaves.push(amt);
        decodedOps.push({
          type: 'Create Account',
          leavesAccount: amt,
          description: `Activate account ${formatAddress(op.destination, 4)} with ${amt}`,
          isHighRisk: false,
        });
      }
    } else if (op.type === 'changeTrust') {
      const assetCode = 'code' in op.line ? op.line.code : 'LiquidityPool';
      const isRemove = op.limit === '0' || op.limit === '0.0000000';
      decodedOps.push({
        type: 'Change Trust',
        description: isRemove ? `Opt out of asset ${assetCode}` : `Opt in to asset ${assetCode}`,
        isHighRisk: false,
      });
    } else if (op.type === 'pathPaymentStrictSend' || op.type === 'pathPaymentStrictReceive') {
      const sendCode = op.sendAsset.isNative() ? 'XLM' : op.sendAsset.code;
      const destCode = op.destAsset.isNative() ? 'XLM' : op.destAsset.code;
      whatLeaves.push(`${(op as any).sendAmount || (op as any).sendMax} ${sendCode}`);
      whatArrives.push(`${(op as any).destMin || (op as any).destAmount} ${destCode}`);

      decodedOps.push({
        type: 'DEX Swap',
        description: `Swap ${sendCode} for ${destCode}`,
        isHighRisk: false,
      });
    } else if (op.type === 'setOptions') {
      hasHighRisk = true;
      warnings.push('This transaction modifies account security signers, weights, or thresholds.');
      decodedOps.push({
        type: 'Security Settings Update',
        description: 'Modifies account signers or thresholds',
        isHighRisk: true,
        riskWarning: 'Modifying signers can give third parties authorization to control your account.',
      });
    } else if (op.type === 'invokeHostFunction') {
      decodedOps.push({
        type: 'Soroban Smart Contract Call',
        description: 'Executes a Soroban smart contract invocation',
        isHighRisk: false,
      });
    } else {
      decodedOps.push({
        type: op.type,
        description: `Stellar operation: ${op.type}`,
        isHighRisk: false,
      });
    }
  }

  // Construct headline in plain language
  let headline = 'This application requests your transaction signature';
  if (whatLeaves.length > 0) {
    headline = `This site will take ${whatLeaves.join(', ')} from your account`;
  } else if (whatArrives.length > 0) {
    headline = `This site will send ${whatArrives.join(', ')} to your account`;
  }

  const feeXlm = (parseInt(innerTx.fee, 10) / 10000000).toFixed(7);

  return {
    headline,
    whatLeaves,
    whatArrives,
    network,
    fee: feeXlm,
    operationsCount: innerTx.operations.length,
    operations: decodedOps,
    hasHighRisk,
    warnings,
    rawXdr: xdr,
  };
}

/**
 * Signs transaction XDR with the user's active keypair.
 */
export function signTransactionXdr(
  xdr: string,
  keypair: Keypair,
  network: NetworkType = 'testnet'
): string {
  const passphrase = NETWORKS[network].networkPassphrase;
  const tx = TransactionBuilder.fromXDR(xdr, passphrase);
  tx.sign(keypair);
  return tx.toXDR();
}
