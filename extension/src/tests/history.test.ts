import { describe, it, expect, beforeEach } from 'vitest';
import { calculatePortfolioTotal, CURRENCY_RATES, syncLiveMarketPrices } from '../services/history';

describe('History & Portfolio Service', () => {
  beforeEach(() => {
    syncLiveMarketPrices({
      XLM: { priceInUsd: 0.124, change24h: 3.45 },
      USDC: { priceInUsd: 1.0, change24h: 0.01 },
    });
  });

  it('calculates portfolio total in different fiat currencies', () => {
    const balances = [
      { code: 'XLM', balance: '1000' }, // 1000 * 0.124 = $124.00
      { code: 'USDC', balance: '50' },   // 50 * 1.00 = $50.00
    ];

    // Total in USD = $174.00
    const inUsd = calculatePortfolioTotal(balances, 'USD');
    expect(inUsd.formatted).toContain('$');
    expect(parseFloat(inUsd.totalFiat)).toBeCloseTo(174.0, 1);

    // Total in NGN
    const inNgn = calculatePortfolioTotal(balances, 'NGN');
    expect(inNgn.formatted).toContain('₦');
    expect(parseFloat(inNgn.totalFiat)).toBeCloseTo(174.0 * CURRENCY_RATES.NGN.rateFromUsd, 0);

    // Total in EUR
    const inEur = calculatePortfolioTotal(balances, 'EUR');
    expect(inEur.formatted).toContain('€');
  });

  it('aggregates weighted 24h portfolio percentage change', () => {
    const balances = [
      { code: 'XLM', balance: '1000' },
      { code: 'USDC', balance: '50' },
    ];
    const res = calculatePortfolioTotal(balances, 'USD');
    expect(parseFloat(res.totalChange24h)).toBeGreaterThan(0);
  });
});
