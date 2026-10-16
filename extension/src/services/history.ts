import { getHorizonServer, NetworkType, formatAddress } from './stellar';

export type ActivityType =
  | 'send'
  | 'receive'
  | 'swap'
  | 'trustline_add'
  | 'trustline_remove'
  | 'contract_call'
  | 'account_created';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string; // ISO
  formattedDate: string;
  txHash: string;
  amount?: string;
  assetCode?: string;
  counterparty?: string;
  status: 'completed' | 'failed';
}

const HISTORY_CACHE_PREFIX = 'tbd_history_';

/**
 * Loads recent operations and payments from Horizon, translating them into human-readable activity items.
 */
export async function getAccountActivity(
  publicKey: string,
  network: NetworkType = 'testnet'
): Promise<ActivityItem[]> {
  const server = getHorizonServer(network);

  try {
    const opPage = await server
      .operations()
      .forAccount(publicKey)
      .limit(30)
      .order('desc')
      .call();

    const items: ActivityItem[] = [];

    for (const op of opPage.records) {
      const anyOp = op as any;
      const createdAt = anyOp.created_at || new Date().toISOString();
      const dateObj = new Date(createdAt);
      const formattedDate = dateObj.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });

      const txHash = anyOp.transaction_hash || anyOp.id;

      if (anyOp.type === 'payment') {
        const isSent = anyOp.from === publicKey;
        const code = anyOp.asset_type === 'native' ? 'XLM' : anyOp.asset_code;
        const target = isSent ? anyOp.to : anyOp.from;

        items.push({
          id: anyOp.id,
          type: isSent ? 'send' : 'receive',
          title: isSent ? `Sent ${anyOp.amount} ${code}` : `Received ${anyOp.amount} ${code}`,
          description: isSent
            ? `Transferred to ${formatAddress(target, 4)}`
            : `Received from ${formatAddress(target, 4)}`,
          timestamp: createdAt,
          formattedDate,
          txHash,
          amount: anyOp.amount,
          assetCode: code,
          counterparty: target,
          status: 'completed',
        });
      } else if (anyOp.type === 'create_account') {
        const isFunder = anyOp.funder === publicKey;
        items.push({
          id: anyOp.id,
          type: 'account_created',
          title: isFunder
            ? `Funded new account with ${anyOp.starting_balance} XLM`
            : `Account activated with ${anyOp.starting_balance} XLM`,
          description: isFunder
            ? `Account ${formatAddress(anyOp.account, 4)}`
            : `By ${formatAddress(anyOp.funder, 4)}`,
          timestamp: createdAt,
          formattedDate,
          txHash,
          amount: anyOp.starting_balance,
          assetCode: 'XLM',
          status: 'completed',
        });
      } else if (anyOp.type === 'change_trust') {
        const isRemove = anyOp.limit === '0.0000000' || anyOp.limit === '0';
        const code = anyOp.asset_code || 'Asset';
        items.push({
          id: anyOp.id,
          type: isRemove ? 'trustline_remove' : 'trustline_add',
          title: isRemove ? `Opted out of ${code}` : `Opted in to ${code}`,
          description: isRemove ? 'Trustline removed (+0.5 XLM)' : 'Trustline added (0.5 XLM reserved)',
          timestamp: createdAt,
          formattedDate,
          txHash,
          assetCode: code,
          status: 'completed',
        });
      } else if (
        anyOp.type === 'path_payment_strict_send' ||
        anyOp.type === 'path_payment_strict_receive'
      ) {
        const fromAsset = anyOp.source_asset_type === 'native' ? 'XLM' : anyOp.source_asset_code;
        const toAsset = anyOp.asset_type === 'native' ? 'XLM' : anyOp.asset_code;

        items.push({
          id: anyOp.id,
          type: 'swap',
          title: `Swapped ${anyOp.source_amount} ${fromAsset} for ${anyOp.amount} ${toAsset}`,
          description: 'Executed on Stellar DEX',
          timestamp: createdAt,
          formattedDate,
          txHash,
          status: 'completed',
        });
      } else if (anyOp.type === 'invoke_host_function') {
        items.push({
          id: anyOp.id,
          type: 'contract_call',
          title: 'Smart Contract Interaction',
          description: 'Soroban contract call executed',
          timestamp: createdAt,
          formattedDate,
          txHash,
          status: 'completed',
        });
      }
    }

    // Cache locally
    try {
      localStorage.setItem(`${HISTORY_CACHE_PREFIX}${publicKey}`, JSON.stringify(items));
    } catch {
      // storage full
    }

    return items;
  } catch {
    // Return cached items if network fails
    const cached = localStorage.getItem(`${HISTORY_CACHE_PREFIX}${publicKey}`);
    return cached ? JSON.parse(cached) : [];
  }
}

export interface MarketPriceData {
  priceInUsd: number;
  change24h: number;
  sparkline: number[];
}

export const MARKET_DATA: Record<string, MarketPriceData> = {
  XLM: {
    priceInUsd: 0,
    change24h: 0,
    sparkline: [],
  },
  USDC: {
    priceInUsd: 0,
    change24h: 0,
    sparkline: [],
  },
  EURC: {
    priceInUsd: 0,
    change24h: 0,
    sparkline: [],
  },
  AQUA: {
    priceInUsd: 0,
    change24h: 0,
    sparkline: [],
  },
  yXLM: {
    priceInUsd: 0,
    change24h: 0,
    sparkline: [],
  },
};

export const CURRENCY_RATES: Record<string, { symbol: string; rateFromUsd: number }> = {
  USD: { symbol: '$', rateFromUsd: 1.0 },
  EUR: { symbol: '€', rateFromUsd: 0.92 },
  NGN: { symbol: '₦', rateFromUsd: 1550.0 },
  GBP: { symbol: '£', rateFromUsd: 0.78 },
};

/**
 * Updates MARKET_DATA in-memory from live market fetch.
 */
export function syncLiveMarketPrices(livePrices: Record<string, { priceInUsd: number; change24h: number }>) {
  for (const [code, info] of Object.entries(livePrices)) {
    if (MARKET_DATA[code]) {
      MARKET_DATA[code].priceInUsd = info.priceInUsd;
      MARKET_DATA[code].change24h = info.change24h;
      if (MARKET_DATA[code].sparkline.length > 0) {
        MARKET_DATA[code].sparkline[MARKET_DATA[code].sparkline.length - 1] = info.priceInUsd;
      }
    } else {
      MARKET_DATA[code] = {
        priceInUsd: info.priceInUsd,
        change24h: info.change24h,
        sparkline: [info.priceInUsd, info.priceInUsd],
      };
    }
  }
}

/**
 * Calculates total portfolio fiat value across all held assets.
 */
export function calculatePortfolioTotal(
  balances: { code: string; balance: string }[],
  currency: 'USD' | 'EUR' | 'NGN' | 'GBP' = 'USD'
): { totalFiat: string; totalChange24h: string; formatted: string } {
  const currencyInfo = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
  let sumUsd = 0;
  let weightedChangeSum = 0;

  for (const b of balances) {
    const data = MARKET_DATA[b.code];
    if (data) {
      const valUsd = parseFloat(b.balance) * data.priceInUsd;
      sumUsd += valUsd;
      weightedChangeSum += valUsd * data.change24h;
    }
  }

  const finalFiat = sumUsd * currencyInfo.rateFromUsd;
  const netChange = sumUsd > 0 ? (weightedChangeSum / sumUsd).toFixed(2) : '0.00';

  return {
    totalFiat: finalFiat.toFixed(2),
    totalChange24h: netChange,
    formatted: `${currencyInfo.symbol}${finalFiat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}
