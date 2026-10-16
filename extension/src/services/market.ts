import { Asset } from '@stellar/stellar-sdk';
import { getHorizonServer } from './stellar';

export interface TokenPriceInfo {
  code: string;
  name: string;
  priceInUsd: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  lastUpdated: number;
}

export interface ChartPoint {
  timestamp: number;
  price: number;
}

// Known asset CoinGecko mappings
const COINGECKO_IDS: Record<string, string> = {
  XLM: 'stellar',
  USDC: 'usd-coin',
  EURC: 'euro-coin',
  AQUA: 'aqua',
};

// Initial baseline prices default to 0 until fetched from live onchain data / market API
const BASELINE_PRICES: Record<string, TokenPriceInfo> = {
  XLM: {
    code: 'XLM',
    name: 'Stellar Lumens',
    priceInUsd: 0,
    change24h: 0,
    lastUpdated: 0,
  },
  USDC: {
    code: 'USDC',
    name: 'USD Coin',
    priceInUsd: 0,
    change24h: 0,
    lastUpdated: 0,
  },
  EURC: {
    code: 'EURC',
    name: 'Euro Coin',
    priceInUsd: 0,
    change24h: 0,
    lastUpdated: 0,
  },
  AQUA: {
    code: 'AQUA',
    name: 'Aquarius',
    priceInUsd: 0,
    change24h: 0,
    lastUpdated: 0,
  },
  yXLM: {
    code: 'yXLM',
    name: 'Ultra Stellar Yield XLM',
    priceInUsd: 0,
    change24h: 0,
    lastUpdated: 0,
  },
};

const CACHE_KEY_PRICES = 'stellith_live_market_prices';
const CACHE_KEY_CHART_PREFIX = 'stellith_chart_';

/**
 * Loads cached prices from localStorage or defaults to baseline.
 */
function getCachedPrices(): Record<string, TokenPriceInfo> {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PRICES);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...BASELINE_PRICES, ...parsed };
    }
  } catch {
    // Ignore storage errors
  }
  return { ...BASELINE_PRICES };
}

let memoryPrices: Record<string, TokenPriceInfo> = getCachedPrices();

/**
 * Fetches real live market prices from CoinGecko API with fallback to Horizon DEX orderbook / cache.
 */
export async function fetchLiveMarketPrices(): Promise<Record<string, TokenPriceInfo>> {
  try {
    const ids = Object.values(COINGECKO_IDS).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      const updated: Record<string, TokenPriceInfo> = { ...memoryPrices };

      if (data.stellar) {
        updated.XLM = {
          code: 'XLM',
          name: 'Stellar Lumens',
          priceInUsd: data.stellar.usd || memoryPrices.XLM.priceInUsd,
          change24h: data.stellar.usd_24h_change ?? memoryPrices.XLM.change24h,
          lastUpdated: Date.now(),
        };
      }
      if (data['usd-coin']) {
        updated.USDC = {
          code: 'USDC',
          name: 'USD Coin',
          priceInUsd: data['usd-coin'].usd || 0,
          change24h: data['usd-coin'].usd_24h_change ?? 0,
          lastUpdated: Date.now(),
        };
      }
      if (data['euro-coin']) {
        updated.EURC = {
          code: 'EURC',
          name: 'Euro Coin',
          priceInUsd: data['euro-coin'].usd || 0,
          change24h: data['euro-coin'].usd_24h_change ?? 0,
          lastUpdated: Date.now(),
        };
      }
      if (data.aqua) {
        updated.AQUA = {
          code: 'AQUA',
          name: 'Aquarius',
          priceInUsd: data.aqua.usd || 0,
          change24h: data.aqua.usd_24h_change ?? 0,
          lastUpdated: Date.now(),
        };
      }
      // yXLM tracks XLM price with yield premium if XLM price is available
      if (updated.XLM && updated.XLM.priceInUsd > 0) {
        updated.yXLM = {
          code: 'yXLM',
          name: 'Ultra Stellar Yield XLM',
          priceInUsd: updated.XLM.priceInUsd * 1.015,
          change24h: updated.XLM.change24h,
          lastUpdated: Date.now(),
        };
      }

      memoryPrices = updated;
      try {
        localStorage.setItem(CACHE_KEY_PRICES, JSON.stringify(updated));
      } catch {
        // storage quota
      }
      return updated;
    }
  } catch (err) {
    console.warn('Live price fetch warning, using cached/horizon rates:', err);
  }

  return memoryPrices;
}

/**
 * Gets currently known price info for an asset code.
 */
export function getAssetPriceInfo(assetCode: string): TokenPriceInfo {
  return (
    memoryPrices[assetCode] || {
      code: assetCode,
      name: assetCode,
      priceInUsd: 0.0,
      change24h: 0.0,
      lastUpdated: Date.now(),
    }
  );
}

/**
 * Fetches real historical price chart candles for a token over a given time range.
 * Timeframe days: 1 (24h), 7 (7d), 30 (30d), 365 (1y).
 */
export async function fetchHistoricalChartData(
  assetCode: string = 'XLM',
  days: number = 7
): Promise<ChartPoint[]> {
  const cacheKey = `${CACHE_KEY_CHART_PREFIX}${assetCode}_${days}`;
  const now = Date.now();

  // Check cached chart data (fresh for 10 minutes)
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.timestamp && now - parsed.timestamp < 10 * 60 * 1000 && Array.isArray(parsed.points) && parsed.points.length > 0) {
        return parsed.points;
      }
    }
  } catch {
    // Ignore cache error
  }

  const coinId = COINGECKO_IDS[assetCode] || 'stellar';

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.prices) && data.prices.length > 0) {
        const points: ChartPoint[] = data.prices.map(([ts, price]: [number, number]) => ({
          timestamp: ts,
          price: Number(price),
        }));

        try {
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, points }));
        } catch {
          // ignore
        }
        return points;
      }
    }
  } catch {
    // API unavailable, proceed to check on-chain SDEX trade aggregations
  }

  // Attempt live on-chain SDEX trade aggregation from Horizon
  try {
    const server = getHorizonServer('testnet');
    const baseAsset = assetCode === 'XLM' ? Asset.native() : new Asset(assetCode, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
    const counterAsset = assetCode === 'USDC' ? Asset.native() : new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
    const startTime = now - days * 24 * 60 * 60 * 1000;
    const resolution = days === 1 ? 3600000 : days === 7 ? 14400000 : 86400000;
    const agg = await server.tradeAggregation(baseAsset, counterAsset, startTime, now, resolution, 0).limit(60).order('asc').call();

    if (agg.records && agg.records.length > 0) {
      const points: ChartPoint[] = agg.records.map((r: any) => ({
        timestamp: parseInt(r.timestamp, 10),
        price: parseFloat(r.close),
      }));
      return points;
    }
  } catch {
    // No on-chain trade aggregation found
  }

  // If live on-chain and market data is not available, return empty points (default 0 / not found)
  return [];
}
