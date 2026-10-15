import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRampQuotes,
  initiateRampTransaction,
  updateRampTransactionStatus,
  getStoredRampTransactions,
  RAMP_PARTNERS,
} from '../services/ramp';

describe('Naira SEP-24 Anchor On/Off Ramp Service (PRD Section 9)', () => {
  beforeEach(() => {
    // Clear storage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Anchor Partner Configuration & Quotes', () => {
    it('provides quotes from all licensed partners (Cowry, Yellow Card, Linker Fi)', () => {
      const quotes = getRampQuotes('buy', 50000);
      expect(quotes.length).toBe(RAMP_PARTNERS.length);
      expect(quotes.length).toBeGreaterThanOrEqual(2);

      quotes.forEach((q) => {
        expect(q.partnerName).toBeTruthy();
        expect(q.domain).toBeTruthy();
        expect(q.rateNgnPerUsdc).toBeGreaterThan(0);
        expect(q.cryptoAmountUsdc).toBeGreaterThan(0);
        expect(q.feeNgn).toBeGreaterThan(0);
        expect(q.isLicensed).toBe(true);
      });
    });

    it('sorts quotes by best user outcome (highest crypto received for buy)', () => {
      const buyQuotes = getRampQuotes('buy', 100000);
      for (let i = 0; i < buyQuotes.length - 1; i++) {
        expect(buyQuotes[i].cryptoAmountUsdc).toBeGreaterThanOrEqual(buyQuotes[i + 1].cryptoAmountUsdc);
      }
    });

    it('sorts quotes by best user outcome (lowest fees for sell)', () => {
      const sellQuotes = getRampQuotes('sell', 100000);
      for (let i = 0; i < sellQuotes.length - 1; i++) {
        expect(sellQuotes[i].feeNgn).toBeLessThanOrEqual(sellQuotes[i + 1].feeNgn);
      }
    });

    it('accurately calculates partner percentage fees', () => {
      const quote = getRampQuotes('buy', 20000)[0];
      const partner = RAMP_PARTNERS.find((p) => p.id === quote.partnerId)!;
      const expectedFee = (20000 * partner.depositFeePercent) / 100;
      expect(quote.feeNgn).toBe(expectedFee);
      expect(quote.netCryptoUsdc).toBeCloseTo((20000 - expectedFee) / partner.rateNgnPerUsdc, 2);
    });

    it('returns empty quotes for zero or negative amounts', () => {
      expect(getRampQuotes('buy', 0)).toEqual([]);
      expect(getRampQuotes('sell', -100)).toEqual([]);
    });
  });

  describe('Transaction Lifecycle & Fraud Disclosures (PRD Section 9)', () => {
    it('initiates a ramp transaction with verified domain and virtual bank instructions', () => {
      const quotes = getRampQuotes('buy', 30000);
      const selectedQuote = quotes[0];
      const userAddress = 'GDJLFK5PMOW6LHG4MWJ5PCDEAY2S7LALMQN5CXB2U75727O5R7B5QG6J';

      const tx = initiateRampTransaction({
        quote: selectedQuote,
        userAddress,
      });

      expect(tx.id).toMatch(/^ramp_/);
      expect(tx.status).toBe('waiting_for_payment');
      expect(tx.domain).toBe(selectedQuote.domain);
      expect(tx.depositInstructions).toBeDefined();
      expect(tx.depositInstructions?.accountNumber).toMatch(/^\d{10}$/);
      expect(tx.depositInstructions?.referenceCode).toMatch(/^STL-\d{6}$/);

      const stored = getStoredRampTransactions();
      expect(stored.some((t) => t.id === tx.id)).toBe(true);
    });

    it('updates transaction status across the SEP-24 state machine', () => {
      const quotes = getRampQuotes('buy', 15000);
      const tx = initiateRampTransaction({
        quote: quotes[0],
        userAddress: 'GDJLFK5PMOW6LHG4MWJ5PCDEAY2S7LALMQN5CXB2U75727O5R7B5QG6J',
      });

      const updated = updateRampTransactionStatus(tx.id, 'completed', 'stellar_tx_hash_abc123');
      expect(updated?.status).toBe('completed');
      expect(updated?.txHash).toBe('stellar_tx_hash_abc123');

      const reloaded = getStoredRampTransactions().find((t) => t.id === tx.id);
      expect(reloaded?.status).toBe('completed');
    });

    it('includes plain-language referral disclosure and SEC licensing info', () => {
      const quote = getRampQuotes('buy', 50000)[0];
      expect(quote.referralDisclosure).toMatch(/referral/i);
      expect(quote.isLicensed).toBe(true);
    });
  });
});
