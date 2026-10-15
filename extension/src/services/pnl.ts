import { MARKET_DATA, MarketPriceData } from './history';
import { AccountBalanceSummary } from './stellar';

export type CostBasisMethod = 'average_cost' | 'fifo';
export type TimeRange = '24h' | '7d' | '30d' | 'all';

export interface AssetPnL {
  assetCode: string;
  currentBalance: string;
  spendableBalance: string;
  currentPrice: number | null;
  currentValue: number | null;
  costBasis: number;
  isCostBasisEstimated: boolean;
  unrealizedPnL: number | null; // in USD
  unrealizedPnLPercent: number | null;
  realizedPnL: number; // in USD
  priceUnavailable: boolean;
}

export interface PortfolioPnLSummary {
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;
  totalRealizedPnL: number;
  timeRange: TimeRange;
  method: CostBasisMethod;
  reservedXlmExcluded: number;
  hasUnavailablePrices: boolean;
  unavailableAssetCodes: string[];
  assets: AssetPnL[];
}

export interface TradeLot {
  id: string;
  timestamp: number;
  assetCode: string;
  amount: number;
  pricePerUnit: number; // in USD
  fee: number; // in USD
  isExternalTransfer?: boolean;
}

// User-overridden cost basis per asset (in USD per unit)
const COST_BASIS_OVERRIDES_KEY = 'tbd_cost_basis_overrides';
let memoryCostBasisOverrides: Record<string, number> = {};

export function getCostBasisOverrides(): Record<string, number> {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(COST_BASIS_OVERRIDES_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return memoryCostBasisOverrides;
}

export function setCostBasisOverride(assetCode: string, unitPrice: number): void {
  memoryCostBasisOverrides[assetCode] = unitPrice;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COST_BASIS_OVERRIDES_KEY, JSON.stringify(memoryCostBasisOverrides));
    }
  } catch {
    // Local storage full
  }
}

export function clearCostBasisOverrides(): void {
  memoryCostBasisOverrides = {};
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(COST_BASIS_OVERRIDES_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Calculates Realized & Unrealized PnL according to PRD Section 7.
 * - Excludes reserved XLM from performance.
 * - Supports Average Cost and FIFO methods.
 * - Handles price unavailable without inventing prices.
 */
export function calculatePortfolioPnL(
  balances: AccountBalanceSummary | null,
  lots: TradeLot[],
  method: CostBasisMethod = 'average_cost',
  timeRange: TimeRange = 'all',
  marketData: Record<string, MarketPriceData> = MARKET_DATA
): PortfolioPnLSummary {
  const overrides = getCostBasisOverrides();
  const unavailableAssetCodes: string[] = [];

  // Excluded reserved XLM amount (baseReserve * 2 + subentries * baseReserve)
  const reservedXlm = balances ? parseFloat(balances.reservedXlm || '0') : 0;

  // Filter lots by time range if necessary
  const now = Date.now();
  let timeCutoff = 0;
  if (timeRange === '24h') timeCutoff = now - 24 * 60 * 60 * 1000;
  else if (timeRange === '7d') timeCutoff = now - 7 * 24 * 60 * 60 * 1000;
  else if (timeRange === '30d') timeCutoff = now - 30 * 24 * 60 * 60 * 1000;

  const relevantLots = lots.filter((lot) => lot.timestamp >= timeCutoff);

  // Collect all unique asset codes
  const assetCodesSet = new Set<string>();
  assetCodesSet.add('XLM');
  if (balances?.assets) {
    balances.assets.forEach((a) => assetCodesSet.add(a.code));
  }
  relevantLots.forEach((l) => assetCodesSet.add(l.assetCode));

  const assetResults: AssetPnL[] = [];
  let totalValue = 0;
  let totalCostBasis = 0;
  let totalRealizedPnL = 0;

  for (const code of Array.from(assetCodesSet)) {
    const isXlm = code === 'XLM';
    const totalBal = isXlm
      ? parseFloat(balances?.totalXlm || '0')
      : parseFloat(balances?.assets.find((a) => a.code === code)?.balance || '0');

    // Performance uses spendable balance for XLM (excludes reserved XLM)
    const effectiveBal = isXlm
      ? Math.max(0, totalBal - reservedXlm)
      : totalBal;

    const marketInfo = marketData[code];
    const price = marketInfo ? marketInfo.priceInUsd : null;
    const isPriceUnavailable = price === null || price === undefined;

    if (isPriceUnavailable && effectiveBal > 0) {
      unavailableAssetCodes.push(code);
    }

    // Filter lots for this asset
    const assetLots = relevantLots.filter((l) => l.assetCode === code);

    // Compute cost basis & realized PnL
    let assetCostBasis = 0;
    let isEstimated = false;
    let realizedPnL = 0;

    // Check manual override first
    if (overrides[code] !== undefined) {
      assetCostBasis = overrides[code] * effectiveBal;
    } else if (method === 'average_cost') {
      let totalBoughtUnits = 0;
      let totalSpent = 0;

      for (const lot of assetLots) {
        if (lot.amount > 0) {
          totalBoughtUnits += lot.amount;
          totalSpent += lot.amount * lot.pricePerUnit + (lot.fee || 0);
          if (lot.isExternalTransfer) isEstimated = true;
        } else if (lot.amount < 0) {
          // Sale: calculate realized gain on sold amount
          const soldUnits = Math.abs(lot.amount);
          const avgCost = totalBoughtUnits > 0 ? totalSpent / totalBoughtUnits : lot.pricePerUnit;
          const revenue = soldUnits * lot.pricePerUnit - (lot.fee || 0);
          const costOfSold = soldUnits * avgCost;
          realizedPnL += revenue - costOfSold;

          // Adjust pool
          totalBoughtUnits = Math.max(0, totalBoughtUnits - soldUnits);
          totalSpent = Math.max(0, totalSpent - costOfSold);
        }
      }

      const avgUnitPrice = totalBoughtUnits > 0 ? totalSpent / totalBoughtUnits : (price || 0);
      assetCostBasis = avgUnitPrice * effectiveBal;
    } else {
      // FIFO Method
      const buyQueue: { amount: number; price: number; feePerUnit: number }[] = [];

      for (const lot of assetLots) {
        if (lot.amount > 0) {
          buyQueue.push({
            amount: lot.amount,
            price: lot.pricePerUnit,
            feePerUnit: (lot.fee || 0) / lot.amount,
          });
          if (lot.isExternalTransfer) isEstimated = true;
        } else if (lot.amount < 0) {
          let unitsToSell = Math.abs(lot.amount);
          const saleRevenuePerUnit = lot.pricePerUnit - (lot.fee || 0) / unitsToSell;

          while (unitsToSell > 0 && buyQueue.length > 0) {
            const oldest = buyQueue[0];
            const matchedUnits = Math.min(unitsToSell, oldest.amount);
            const costOfMatched = matchedUnits * (oldest.price + oldest.feePerUnit);
            const revOfMatched = matchedUnits * saleRevenuePerUnit;
            realizedPnL += revOfMatched - costOfMatched;

            oldest.amount -= matchedUnits;
            unitsToSell -= matchedUnits;
            if (oldest.amount <= 0.0000001) {
              buyQueue.shift();
            }
          }
        }
      }

      // Remaining lots in queue determine cost basis for remaining holdings
      let remainingCost = 0;
      let remainingUnits = 0;
      for (const b of buyQueue) {
        remainingCost += b.amount * (b.price + b.feePerUnit);
        remainingUnits += b.amount;
      }

      if (remainingUnits > 0) {
        const unitCost = remainingCost / remainingUnits;
        assetCostBasis = unitCost * effectiveBal;
      } else {
        assetCostBasis = (price || 0) * effectiveBal;
      }
    }

    const currentValue = price !== null ? price * effectiveBal : null;
    const unrealizedPnL =
      currentValue !== null ? currentValue - assetCostBasis : null;
    const unrealizedPnLPercent =
      currentValue !== null && assetCostBasis > 0
        ? ((currentValue - assetCostBasis) / assetCostBasis) * 100
        : 0;

    if (currentValue !== null) {
      totalValue += currentValue;
      totalCostBasis += assetCostBasis;
    }
    totalRealizedPnL += realizedPnL;

    assetResults.push({
      assetCode: code,
      currentBalance: totalBal.toFixed(4),
      spendableBalance: effectiveBal.toFixed(4),
      currentPrice: price,
      currentValue,
      costBasis: assetCostBasis,
      isCostBasisEstimated: isEstimated,
      unrealizedPnL,
      unrealizedPnLPercent,
      realizedPnL,
      priceUnavailable: isPriceUnavailable,
    });
  }

  const totalUnrealizedPnL = totalValue - totalCostBasis;
  const totalUnrealizedPnLPercent =
    totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;

  return {
    totalValue,
    totalCostBasis,
    totalUnrealizedPnL,
    totalUnrealizedPnLPercent,
    totalRealizedPnL,
    timeRange,
    method,
    reservedXlmExcluded: reservedXlm,
    hasUnavailablePrices: unavailableAssetCodes.length > 0,
    unavailableAssetCodes,
    assets: assetResults.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0)),
  };
}
