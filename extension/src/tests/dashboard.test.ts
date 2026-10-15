import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculatePortfolioPnL,
  setCostBasisOverride,
  clearCostBasisOverrides,
  TradeLot,
} from '../services/pnl';
import {
  createPriceAlert,
  getStoredAlerts,
  deletePriceAlert,
  togglePriceAlert,
  evaluatePriceAlerts,
  saveStoredAlerts,
} from '../services/alerts';
import { exportPortfolioCsv, DexOrder } from '../services/orders';
import { AccountBalanceSummary } from '../services/stellar';
import { ActivityItem } from '../services/history';

describe('Portfolio Dashboard, PnL, Price Alerts & Orders (PRD Section 7)', () => {
  beforeEach(() => {
    clearCostBasisOverrides();
    saveStoredAlerts([]);
  });

  describe('PnL and Cost Basis Engine', () => {
    const mockBalances: AccountBalanceSummary = {
      exists: true,
      totalXlm: '100.0000000',
      spendableXlm: '97.5000000',
      reservedXlm: '2.5000000',
      subentryCount: 3,
      baseReserve: 0.5,
      reserveExplanation: '2.5 XLM reserved for base account and 3 subentries',
      assets: [
        {
          code: 'USDC',
          issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          balance: '50.0000000',
          limit: '100000.0000000',
          isNative: false,
        },
        {
          code: 'AQUA',
          issuer: 'GBNZILSTVQZ4ROOF2M4VPOZ7SBNIS2ACF3VUGSE677ABCDEF12345678',
          balance: '1000.0000000',
          limit: '100000.0000000',
          isNative: false,
        },
      ],
    };

    const mockLots: TradeLot[] = [
      // Lot 1: Bought 50 XLM at $0.10
      {
        id: '1',
        timestamp: Date.now() - 10000,
        assetCode: 'XLM',
        amount: 50,
        pricePerUnit: 0.1,
        fee: 0.0001,
      },
      // Lot 2: Bought 50 XLM at $0.12
      {
        id: '2',
        timestamp: Date.now() - 5000,
        assetCode: 'XLM',
        amount: 50,
        pricePerUnit: 0.12,
        fee: 0.0001,
      },
    ];

    it('calculates Average Cost basis correctly and excludes reserved XLM from performance', () => {
      const summary = calculatePortfolioPnL(
        mockBalances,
        mockLots,
        'average_cost',
        'all',
        {
          XLM: { priceInUsd: 0.15, change24h: 5.0, sparkline: [] },
          USDC: { priceInUsd: 1.0, change24h: 0.0, sparkline: [] },
          AQUA: { priceInUsd: 0.002, change24h: 1.0, sparkline: [] },
        }
      );

      // Total XLM is 100, reserved is 2.5, spendable is 97.5
      expect(summary.reservedXlmExcluded).toBe(2.5);
      const xlmAsset = summary.assets.find((a) => a.assetCode === 'XLM');
      expect(xlmAsset).toBeDefined();
      expect(xlmAsset?.spendableBalance).toBe('97.5000');

      // Average cost per unit = (50*0.10 + 50*0.12 + fees) / 100 ≈ 0.110002
      // For 97.5 spendable XLM at current price $0.15:
      // Current Value = 97.5 * 0.15 = 14.625
      expect(xlmAsset?.currentValue).toBeCloseTo(14.625, 2);
      expect(xlmAsset?.unrealizedPnL).toBeGreaterThan(0);
    });

    it('calculates FIFO cost basis and realized PnL on disposals', () => {
      const fifoLots: TradeLot[] = [
        {
          id: '1',
          timestamp: Date.now() - 20000,
          assetCode: 'XLM',
          amount: 50,
          pricePerUnit: 0.08,
          fee: 0,
        },
        {
          id: '2',
          timestamp: Date.now() - 15000,
          assetCode: 'XLM',
          amount: 50,
          pricePerUnit: 0.12,
          fee: 0,
        },
        // Sold 30 XLM at $0.15
        {
          id: '3',
          timestamp: Date.now() - 10000,
          assetCode: 'XLM',
          amount: -30,
          pricePerUnit: 0.15,
          fee: 0,
        },
      ];

      const summary = calculatePortfolioPnL(
        mockBalances,
        fifoLots,
        'fifo',
        'all',
        {
          XLM: { priceInUsd: 0.15, change24h: 0, sparkline: [] },
        }
      );

      const xlmAsset = summary.assets.find((a) => a.assetCode === 'XLM');
      expect(xlmAsset).toBeDefined();
      // FIFO: 30 sold were matched against Lot 1 (bought at 0.08)
      // Realized profit = 30 * (0.15 - 0.08) = 2.10
      expect(xlmAsset?.realizedPnL).toBeCloseTo(2.1, 2);
    });

    it('handles price unavailable without inventing prices and flags note', () => {
      const summary = calculatePortfolioPnL(
        mockBalances,
        mockLots,
        'average_cost',
        'all',
        {
          XLM: { priceInUsd: 0.15, change24h: 0, sparkline: [] },
          // USDC price missing
          // AQUA price missing
        }
      );

      expect(summary.hasUnavailablePrices).toBe(true);
      expect(summary.unavailableAssetCodes).toContain('USDC');
      expect(summary.unavailableAssetCodes).toContain('AQUA');

      const usdcAsset = summary.assets.find((a) => a.assetCode === 'USDC');
      expect(usdcAsset?.priceUnavailable).toBe(true);
      expect(usdcAsset?.currentValue).toBeNull();
      expect(usdcAsset?.unrealizedPnL).toBeNull();
    });

    it('supports custom cost basis override for external incoming transfers', () => {
      setCostBasisOverride('USDC', 0.98);

      const summary = calculatePortfolioPnL(
        mockBalances,
        [],
        'average_cost',
        'all',
        {
          USDC: { priceInUsd: 1.0, change24h: 0, sparkline: [] },
        }
      );

      const usdc = summary.assets.find((a) => a.assetCode === 'USDC');
      expect(usdc).toBeDefined();
      // 50 USDC * $0.98 cost basis = $49.00
      expect(usdc?.costBasis).toBeCloseTo(49.0, 2);
      // Current value: 50 * 1.0 = $50.00, unrealized PnL = $1.00
      expect(usdc?.unrealizedPnL).toBeCloseTo(1.0, 2);
    });
  });

  describe('Price Alerts Service', () => {
    it('creates, saves, and toggles price alerts', () => {
      const alert = createPriceAlert({
        assetCode: 'XLM',
        condition: 'above',
        targetValue: 0.2,
        currentPrice: 0.12,
      });

      expect(alert.id).toBeDefined();
      expect(alert.assetCode).toBe('XLM');
      expect(alert.active).toBe(true);

      const stored = getStoredAlerts();
      expect(stored.length).toBe(1);

      togglePriceAlert(alert.id, false);
      expect(getStoredAlerts()[0].active).toBe(false);

      deletePriceAlert(alert.id);
      expect(getStoredAlerts().length).toBe(0);
    });

    it('evaluates price alerts and triggers notifications when condition is met', () => {
      createPriceAlert({
        assetCode: 'XLM',
        condition: 'above',
        targetValue: 0.15,
      });

      createPriceAlert({
        assetCode: 'USDC',
        condition: 'below',
        targetValue: 0.95,
      });

      // Case 1: XLM price is $0.14 (below target)
      let triggered = evaluatePriceAlerts({ XLM: 0.14, USDC: 0.99 });
      expect(triggered.length).toBe(0);

      // Case 2: XLM price rises to $0.16 (above target)
      triggered = evaluatePriceAlerts({ XLM: 0.16, USDC: 0.99 });
      expect(triggered.length).toBe(1);
      expect(triggered[0].assetCode).toBe('XLM');
      expect(triggered[0].triggeredAt).toBeDefined();
    });
  });

  describe('DEX Orders & CSV Export', () => {
    it('generates well-structured CSV export with headers, holdings, orders, and history', () => {
      const summary = calculatePortfolioPnL(
        null,
        [],
        'average_cost',
        'all',
        {
          XLM: { priceInUsd: 0.12, change24h: 0, sparkline: [] },
        }
      );

      const activity: ActivityItem[] = [
        {
          id: 'tx_1',
          type: 'send',
          title: 'Sent 10 XLM',
          description: 'Payment',
          timestamp: '2026-10-15T12:00:00Z',
          formattedDate: 'Oct 15',
          txHash: 'abcdef123456',
          amount: '10',
          assetCode: 'XLM',
          status: 'completed',
        },
      ];

      const orders: DexOrder[] = [
        {
          id: 'offer_1',
          type: 'sell',
          sellingAssetCode: 'XLM',
          buyingAssetCode: 'USDC',
          amount: '100',
          price: '0.15',
          priceNumerator: 15,
          priceDenominator: 100,
          timestamp: '2026-10-15T12:00:00Z',
          status: 'open',
        },
      ];

      const csv = exportPortfolioCsv(summary, activity, orders);

      expect(csv).toContain('--- PORTFOLIO SUMMARY ---');
      expect(csv).toContain('--- ASSET HOLDINGS ---');
      expect(csv).toContain('--- OPEN DEX OFFERS ---');
      expect(csv).toContain('--- TRANSACTION HISTORY ---');
      expect(csv).toContain('XLM');
      expect(csv).toContain('offer_1');
      expect(csv).toContain('tx_1');
      expect(csv).toContain('abcdef123456');
    });
  });
});
