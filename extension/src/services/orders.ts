import {
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Keypair,
} from '@stellar/stellar-sdk';
import { getHorizonServer, NETWORKS, NetworkType } from './stellar';
import { Signer } from './signer';
import { PortfolioPnLSummary } from './pnl';
import { ActivityItem } from './history';

export interface DexOrder {
  id: string;
  type: 'buy' | 'sell';
  sellingAssetCode: string;
  buyingAssetCode: string;
  amount: string;
  price: string;
  priceNumerator: number;
  priceDenominator: number;
  timestamp: string;
  status: 'open' | 'filled' | 'cancelled';
  rawOffer?: any;
}

/**
 * Fetches open classic DEX offers for a given Stellar account.
 */
export async function getOpenOffers(
  publicKey: string,
  network: NetworkType = 'testnet'
): Promise<DexOrder[]> {
  const server = getHorizonServer(network);

  try {
    const page = await server.offers().forAccount(publicKey).order('desc').limit(20).call();
    return page.records.map((record: any) => {
      const sellingCode =
        record.selling.asset_type === 'native' ? 'XLM' : record.selling.asset_code;
      const buyingCode =
        record.buying.asset_type === 'native' ? 'XLM' : record.buying.asset_code;

      return {
        id: record.id,
        type: 'sell',
        sellingAssetCode: sellingCode,
        buyingAssetCode: buyingCode,
        amount: record.amount,
        price: record.price,
        priceNumerator: record.price_r.n,
        priceDenominator: record.price_r.d,
        timestamp: record.last_modified_time || new Date().toISOString(),
        status: 'open',
        rawOffer: record,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Cancels an open DEX offer by setting amount to '0' (PRD Section 7 P1).
 */
export async function cancelOffer(params: {
  offer: DexOrder;
  network?: NetworkType;
  keypair?: Keypair;
  signer?: Signer;
}): Promise<{ hash: string }> {
  const network = params.network || 'testnet';
  const server = getHorizonServer(network);
  const networkConfig = NETWORKS[network];

  const sourcePubkey = params.signer ? params.signer.publicKey : params.keypair?.publicKey();
  if (!sourcePubkey) throw new Error('No signing credentials available to cancel offer');

  const sourceAccount = await server.loadAccount(sourcePubkey);

  const raw = params.offer.rawOffer;
  let sellingAsset = Asset.native();
  if (raw && raw.selling && raw.selling.asset_type !== 'native') {
    sellingAsset = new Asset(raw.selling.asset_code, raw.selling.asset_issuer);
  }

  let buyingAsset = Asset.native();
  if (raw && raw.buying && raw.buying.asset_type !== 'native') {
    buyingAsset = new Asset(raw.buying.asset_code, raw.buying.asset_issuer);
  }

  const txBuilder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: networkConfig.networkPassphrase,
  });

  // ManageSellOffer with amount '0' and offerId cancels the existing offer
  txBuilder.addOperation(
    Operation.manageSellOffer({
      selling: sellingAsset,
      buying: buyingAsset,
      amount: '0',
      price: params.offer.price,
      offerId: params.offer.id,
    })
  );

  txBuilder.setTimeout(30);
  const tx = txBuilder.build();

  if (params.signer) {
    const signedXdr = await params.signer.signTransaction(
      tx.toXDR(),
      networkConfig.networkPassphrase
    );
    const signedTx = TransactionBuilder.fromXDR(signedXdr, networkConfig.networkPassphrase);
    const res = await server.submitTransaction(signedTx);
    return { hash: res.hash };
  }

  if (!params.keypair) {
    throw new Error('No local keypair or hardware signer available');
  }

  tx.sign(params.keypair);
  const res = await server.submitTransaction(tx);
  return { hash: res.hash };
}

/**
 * Exports portfolio assets, historical activity, and DEX orders to a CSV string and downloads it.
 */
export function exportPortfolioCsv(
  pnlSummary: PortfolioPnLSummary,
  activity: ActivityItem[],
  orders: DexOrder[]
): string {
  const lines: string[] = [];

  // Section 1: Portfolio Holdings & PnL
  lines.push('--- PORTFOLIO SUMMARY ---');
  lines.push(`Total Value (USD),${pnlSummary.totalValue.toFixed(2)}`);
  lines.push(`Total Cost Basis (USD),${pnlSummary.totalCostBasis.toFixed(2)}`);
  lines.push(`Unrealized PnL (USD),${pnlSummary.totalUnrealizedPnL.toFixed(2)}`);
  lines.push(`Unrealized PnL (%),${pnlSummary.totalUnrealizedPnLPercent.toFixed(2)}%`);
  lines.push(`Realized PnL (USD),${pnlSummary.totalRealizedPnL.toFixed(2)}`);
  lines.push(`Calculation Method,${pnlSummary.method === 'average_cost' ? 'Average Cost' : 'FIFO'}`);
  lines.push(`Reserved XLM Excluded,${pnlSummary.reservedXlmExcluded.toFixed(4)} XLM`);
  lines.push('');

  lines.push('--- ASSET HOLDINGS ---');
  lines.push('Asset,Total Balance,Spendable Balance,Price (USD),Value (USD),Cost Basis (USD),Unrealized PnL (USD),Unrealized PnL (%),Status');
  for (const a of pnlSummary.assets) {
    lines.push(
      [
        a.assetCode,
        a.currentBalance,
        a.spendableBalance,
        a.currentPrice !== null ? a.currentPrice.toFixed(4) : 'N/A',
        a.currentValue !== null ? a.currentValue.toFixed(2) : 'N/A',
        a.costBasis.toFixed(2),
        a.unrealizedPnL !== null ? a.unrealizedPnL.toFixed(2) : 'N/A',
        a.unrealizedPnLPercent !== null ? `${a.unrealizedPnLPercent.toFixed(2)}%` : 'N/A',
        a.priceUnavailable ? 'Price Unavailable' : 'Active',
      ].join(',')
    );
  }
  lines.push('');

  // Section 2: DEX Orders
  lines.push('--- OPEN DEX OFFERS ---');
  lines.push('Offer ID,Selling,Buying,Amount,Price,Timestamp,Status');
  for (const o of orders) {
    lines.push([o.id, o.sellingAssetCode, o.buyingAssetCode, o.amount, o.price, o.timestamp, o.status].join(','));
  }
  lines.push('');

  // Section 3: Transaction Activity
  lines.push('--- TRANSACTION HISTORY ---');
  lines.push('ID,Type,Date,Title,Amount,Asset,Tx Hash');
  for (const act of activity) {
    lines.push(
      [
        act.id,
        act.type,
        act.timestamp,
        `"${act.title.replace(/"/g, '""')}"`,
        act.amount || '',
        act.assetCode || '',
        act.txHash,
      ].join(',')
    );
  }

  const csvContent = lines.join('\n');

  // Trigger browser download if in window context
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stellith_portfolio_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return csvContent;
}
