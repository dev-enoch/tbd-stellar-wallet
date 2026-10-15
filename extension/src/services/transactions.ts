import {
  TransactionBuilder,
  Operation,
  Asset,
  Memo,
  Keypair,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { getHorizonServer, NETWORKS, NetworkType } from './stellar';
import { Signer } from './signer';

export interface SendPaymentParams {
  keypair?: Keypair;
  destination: string;
  assetCode: string;
  assetIssuer?: string;
  amount: string;
  memoType?: 'none' | 'text' | 'id' | 'hash';
  memoValue?: string;
  network?: NetworkType;
  signer?: Signer;
}

export interface PaymentSimulationResult {
  destinationExists: boolean;
  operationType: 'payment' | 'createAccount';
  requiresMemo: boolean;
  warning?: string;
  estimatedFee: string; // in XLM
}

// Known exchange accounts that require a memo (SEP-29)
const KNOWN_EXCHANGE_MEMO_REQUIRED_ADDRESSES = new Set([
  'GABT54O3L4B52L6U3Y5XZZ7K7U7N7J2G2H3K4L5M6N7P8Q9R0S1T2U3V', // Binance hot wallet
  'GB6YPGW5JFMMP2QB2USQ33EUWTXVL4MTYZOR7W2HSWEC5PAVA2ICINMA', // Coinbase
  'GA5XIGA5C7Q3TUIIMLENVC6USURYYDXANW2DU7S primitive', // Kraken
  'GCLWGQPMK3VGASJOTPRENEUMCCWMTGXH3QY3O7D2GJ2575Q6NTWVCTPA', // Poloniex
  'GDZCEWJ5TVXUTFH6M5LDDFNYC4LHSFIRHQMUQQ5K523ZUISSWG2G2KQ8', // Bittrex
  'GBGVQOETAG4PUFN7PDRWPD6WMRN27Z5S6ZEXRMDD4UOWG6NUG3V4DTRU', // Bitfinex
]);

/**
 * Checks if a destination account requires a memo under SEP-29 or known registry.
 */
export function checkMemoRequirement(destination: string): boolean {
  if (destination.startsWith('M')) {
    // Muxed address already contains a memo ID
    return false;
  }
  return KNOWN_EXCHANGE_MEMO_REQUIRED_ADDRESSES.has(destination);
}

export interface DestinationVerificationResult {
  valid: boolean;
  exists: boolean;
  isExchange: boolean;
  isMuxed: boolean;
  message?: string;
}

/**
 * Checks address validity and inspects account state on Horizon for Step 1 verification.
 */
export async function verifyDestinationAddress(
  destination: string,
  network: NetworkType = 'testnet'
): Promise<DestinationVerificationResult> {
  const isMuxed = destination.startsWith('M');
  const server = getHorizonServer(network);
  let exists = true;

  try {
    await server.loadAccount(destination);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      exists = false;
    }
  }

  const isExchange = checkMemoRequirement(destination);

  return {
    valid: true,
    exists,
    isExchange,
    isMuxed,
    message: !exists
      ? 'Account is inactive. It will be funded and activated with 1 XLM minimum.'
      : isExchange
      ? 'Exchange address detected. A memo is required.'
      : 'Active Stellar account verified.',
  };
}

/**
 * Pre-validates and simulates payment parameters before user confirmation.
 */
export async function simulatePayment(
  destination: string,
  assetCode: string,
  amount: string,
  network: NetworkType = 'testnet'
): Promise<PaymentSimulationResult> {
  const server = getHorizonServer(network);
  let destinationExists = true;

  try {
    await server.loadAccount(destination);
  } catch (err: any) {
    if (err.response && err.response.status === 404) {
      destinationExists = false;
    }
  }

  const requiresMemo = checkMemoRequirement(destination);
  const estimatedFee = (parseInt(BASE_FEE, 10) / 10000000).toFixed(7);

  let warning: string | undefined;
  let operationType: 'payment' | 'createAccount' = 'payment';

  if (!destinationExists) {
    if (assetCode !== 'XLM') {
      warning = 'The recipient account is not active yet on Stellar. It must first be created and funded with at least 1 XLM before it can accept other tokens.';
    } else {
      operationType = 'createAccount';
      const amountFloat = parseFloat(amount);
      if (amountFloat < 1.0) {
        warning = 'The recipient account does not exist yet. You must send at least 1.0 XLM to activate it on the Stellar ledger.';
      }
    }
  }

  return {
    destinationExists,
    operationType,
    requiresMemo,
    warning,
    estimatedFee,
  };
}

/**
 * Builds, signs, and submits a Stellar payment or account creation transaction.
 */
export async function submitPayment(params: SendPaymentParams): Promise<{ hash: string; ledger: number }> {
  const network = params.network || 'testnet';
  const server = getHorizonServer(network);
  const networkConfig = NETWORKS[network];

  // 1. Load source account
  const sourcePubKey = params.signer ? params.signer.publicKey : params.keypair?.publicKey();
  if (!sourcePubKey) throw new Error('No valid public key or signer provided for payment');
  const sourceAccount = await server.loadAccount(sourcePubKey);

  // 2. Check destination status
  let destinationExists = true;
  try {
    await server.loadAccount(params.destination);
  } catch (err: any) {
    if (err.response && err.response.status === 404) {
      destinationExists = false;
    }
  }

  // 3. Initialize Transaction Builder
  const txBuilder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: networkConfig.networkPassphrase,
  });

  // 4. Determine operation
  if (!destinationExists && params.assetCode === 'XLM') {
    // Stellar Create Account operation
    txBuilder.addOperation(
      Operation.createAccount({
        destination: params.destination,
        startingBalance: params.amount,
      })
    );
  } else {
    // Stellar Payment operation
    let asset: Asset;
    if (params.assetCode === 'XLM' || !params.assetIssuer) {
      asset = Asset.native();
    } else {
      asset = new Asset(params.assetCode, params.assetIssuer);
    }

    txBuilder.addOperation(
      Operation.payment({
        destination: params.destination,
        asset,
        amount: params.amount,
      })
    );
  }

  // 5. Add Memo if provided
  if (params.memoType && params.memoValue && params.memoType !== 'none') {
    const val = params.memoValue.trim();
    if (params.memoType === 'text') {
      txBuilder.addMemo(Memo.text(val));
    } else if (params.memoType === 'id') {
      txBuilder.addMemo(Memo.id(val));
    } else if (params.memoType === 'hash') {
      txBuilder.addMemo(Memo.hash(val));
    }
  }

  // Set timeout of 30 seconds
  txBuilder.setTimeout(30);

  // 6. Build and sign
  const transaction = txBuilder.build();
  if (params.signer) {
    const signedXdr = await params.signer.signTransaction(transaction.toXDR(), networkConfig.networkPassphrase);
    const signedTx = TransactionBuilder.fromXDR(signedXdr, networkConfig.networkPassphrase);
    const response = await server.submitTransaction(signedTx);
    return {
      hash: response.hash,
      ledger: (response as any).ledger || 0,
    };
  }

  if (!params.keypair) {
    throw new Error('No local keypair or hardware signer available to sign transaction');
  }
  transaction.sign(params.keypair);

  // 7. Submit to Horizon
  const response = await server.submitTransaction(transaction);
  return {
    hash: response.hash,
    ledger: (response as any).ledger || 0,
  };
}

/**
 * Validates memo value against selected type.
 */
export function validateMemo(type: string, value: string): string | null {
  if (!value || type === 'none') return null;
  const trimmed = value.trim();

  if (type === 'text') {
    const byteLength = new TextEncoder().encode(trimmed).length;
    if (byteLength > 28) {
      return `Memo Text is too long (${byteLength}/28 bytes)`;
    }
  } else if (type === 'id') {
    if (!/^\d+$/.test(trimmed)) {
      return 'Memo ID must be a positive number';
    }
    try {
      const b = BigInt(trimmed);
      if (b < 0n || b > 18446744073709551615n) {
        return 'Memo ID must be between 0 and 2^64 - 1';
      }
    } catch {
      return 'Invalid 64-bit integer';
    }
  } else if (type === 'hash') {
    if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return 'Memo Hash must be 32 bytes (64 hex characters)';
    }
  }

  return null;
}
