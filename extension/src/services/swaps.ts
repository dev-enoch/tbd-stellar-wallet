import {
  TransactionBuilder,
  Operation,
  Asset,
  Keypair,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { getHorizonServer, NETWORKS, NetworkType } from './stellar';
import { Signer } from './signer';

export interface SwapQuote {
  fromAssetCode: string;
  fromAssetIssuer?: string;
  toAssetCode: string;
  toAssetIssuer?: string;
  sendAmount: string;
  expectedOutput: string;
  minimumReceived: string;
  rate: string; // 1 from = X to
  priceImpact: number; // percentage, e.g. 0.25%
  route: string[]; // e.g. ["XLM", "USDC"] or ["XLM", "AQUA", "USDC"]
  networkFee: string;
  expiresInSeconds: number;
  source: 'aggregator' | 'stellar_dex';
  needsTrustline: boolean;
}

export interface SwapParams {
  keypair?: Keypair;
  quote: SwapQuote;
  network?: NetworkType;
  signer?: Signer;
}

/**
 * Helper to construct an Asset instance
 */
function createAsset(code: string, issuer?: string): Asset {
  if (code === 'XLM' || !issuer) {
    return Asset.native();
  }
  return new Asset(code, issuer);
}

/**
 * Fetches best-price swap route from Horizon DEX path finding with slippage and price impact.
 */
export async function getSwapQuote(
  fromCode: string,
  fromIssuer: string | undefined,
  toCode: string,
  toIssuer: string | undefined,
  sendAmount: string,
  slippageTolerancePercent: number = 0.5,
  userAddress: string,
  network: NetworkType = 'testnet'
): Promise<SwapQuote> {
  const server = getHorizonServer(network);
  const sendAsset = createAsset(fromCode, fromIssuer);
  const destAsset = createAsset(toCode, toIssuer);

  // Check if destination trustline exists in user's account
  let needsTrustline = false;
  if (!destAsset.isNative()) {
    try {
      const acc = await server.loadAccount(userAddress);
      const hasTrust = acc.balances.some(
        (b: any) => b.asset_code === toCode && b.asset_issuer === toIssuer
      );
      needsTrustline = !hasTrust;
    } catch {
      needsTrustline = true;
    }
  }

  let expectedOutput = '0';
  let routePath: string[] = [fromCode, toCode];
  let quoteSource: 'aggregator' | 'stellar_dex' = 'stellar_dex';
  let priceImpact = 0.15; // default nominal

  try {
    const paths = await server
      .strictSendPaths(sendAsset, sendAmount, [destAsset])
      .call();

    if (paths.records && paths.records.length > 0) {
      // Pick best path (highest destination amount) from on-chain SDEX
      const best = paths.records[0];
      expectedOutput = parseFloat(best.destination_amount).toFixed(4);
      if (best.path && best.path.length > 0) {
        routePath = [
          fromCode,
          ...best.path.map((p: any) => p.asset_code || 'XLM'),
          toCode,
        ];
      }
    } else {
      // No live on-chain path/liquidity found
      expectedOutput = '0';
    }
  } catch {
    // No path found or ledger query error - default to 0
    expectedOutput = '0';
  }

  const expectedFloat = parseFloat(expectedOutput);
  const slippageFraction = slippageTolerancePercent / 100;
  const minimumReceived = (expectedFloat * (1 - slippageFraction)).toFixed(4);

  const sendFloat = parseFloat(sendAmount);
  const rate = sendFloat > 0 ? (expectedFloat / sendFloat).toFixed(4) : '0.00';

  // Estimate price impact based on trade size
  if (sendFloat > 1000) {
    priceImpact = 2.4;
  } else if (sendFloat > 100) {
    priceImpact = 0.8;
  } else {
    priceImpact = 0.2;
  }

  return {
    fromAssetCode: fromCode,
    fromAssetIssuer: fromIssuer,
    toAssetCode: toCode,
    toAssetIssuer: toIssuer,
    sendAmount,
    expectedOutput,
    minimumReceived,
    rate,
    priceImpact,
    route: routePath,
    networkFee: (parseInt(BASE_FEE, 10) / 10000000).toFixed(7),
    expiresInSeconds: 30,
    source: quoteSource,
    needsTrustline,
  };
}

/**
 * Builds, signs, and executes the swap on the Stellar DEX.
 * If user lacks trustline for destination asset, auto-bundles change_trust operation!
 */
export async function executeSwap(params: SwapParams): Promise<{ hash: string; outputAmount: string }> {
  const network = params.network || 'testnet';
  const server = getHorizonServer(network);
  const networkConfig = NETWORKS[network];

  const senderPublicKey = params.signer ? params.signer.publicKey : params.keypair?.publicKey();
  if (!senderPublicKey) throw new Error('No valid public key or signer provided for swap');

  const sourceAccount = await server.loadAccount(senderPublicKey);

  const sendAsset = createAsset(params.quote.fromAssetCode, params.quote.fromAssetIssuer);
  const destAsset = createAsset(params.quote.toAssetCode, params.quote.toAssetIssuer);

  // Extra fee if bundling trustline operation
  const totalFee = params.quote.needsTrustline
    ? String(parseInt(BASE_FEE, 10) * 2)
    : BASE_FEE;

  const txBuilder = new TransactionBuilder(sourceAccount, {
    fee: totalFee,
    networkPassphrase: networkConfig.networkPassphrase,
  });

  // Step 1: Auto-bundle trustline if needed
  if (params.quote.needsTrustline && !destAsset.isNative()) {
    txBuilder.addOperation(
      Operation.changeTrust({
        asset: destAsset,
      })
    );
  }

  // Step 2: Add Path Payment Strict Send operation
  // path conversion
  const pathAssets: Asset[] = [];
  if (params.quote.route.length > 2) {
    for (let i = 1; i < params.quote.route.length - 1; i++) {
      const code = params.quote.route[i];
      pathAssets.push(createAsset(code));
    }
  }

  txBuilder.addOperation(
    Operation.pathPaymentStrictSend({
      sendAsset,
      sendAmount: params.quote.sendAmount,
      destination: senderPublicKey,
      destAsset,
      destMin: params.quote.minimumReceived,
      path: pathAssets,
    })
  );

  txBuilder.setTimeout(30);

  const transaction = txBuilder.build();
  if (params.signer) {
    const signedXdr = await params.signer.signTransaction(transaction.toXDR(), networkConfig.networkPassphrase);
    const signedTx = TransactionBuilder.fromXDR(signedXdr, networkConfig.networkPassphrase);
    const response = await server.submitTransaction(signedTx);
    return {
      hash: response.hash,
      outputAmount: params.quote.expectedOutput,
    };
  }

  if (!params.keypair) {
    throw new Error('No local keypair or hardware signer available to sign swap transaction');
  }
  transaction.sign(params.keypair);

  const response = await server.submitTransaction(transaction);
  return {
    hash: response.hash,
    outputAmount: params.quote.expectedOutput,
  };
}
