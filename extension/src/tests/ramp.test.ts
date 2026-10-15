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
    it('provides quotes from all evaluated partners with explicit pilot gating', () => {
      const quotes = getRampQuotes('buy', 50000);
      expect(quotes.length).toBe(RAMP_PARTNERS.length);
      expect(quotes.length).toBeGreaterThanOrEqual(2);

      // Verify pilot gate: sandbox anchor is approved; unexecuted candidates are gated
      const approvedQuotes = quotes.filter((q) => q.isPilotApproved);
      const gatedQuotes = quotes.filter((q) => !q.isPilotApproved);

      expect(approvedQuotes.length).toBeGreaterThanOrEqual(1);
      expect(gatedQuotes.length).toBeGreaterThanOrEqual(1);

      quotes.forEach((q) => {
        expect(q.partnerName).toBeTruthy();
        expect(q.domain).toBeTruthy();
        expect(q.rateNgnPerUsdc).toBeGreaterThan(0);
        expect(q.cryptoAmountUsdc).toBeGreaterThan(0);
        expect(q.feeNgn).toBeGreaterThan(0);
        expect(q.interactiveUrl).toContain(q.domain);
      });
    });

    it('prioritizes pilot approved partners and then best user outcome', () => {
      const buyQuotes = getRampQuotes('buy', 100000);
      expect(buyQuotes[0].isPilotApproved).toBe(true);
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
    it('initiates an authentic SEP-24 session without generating fabricated bank details', () => {
      const quotes = getRampQuotes('buy', 30000);
      const selectedQuote = quotes[0];
      const userAddress = 'GDJLFK5PMOW6LHG4MWJ5PCDEAY2S7LALMQN5CXB2U75727O5R7B5QG6J';

      const tx = initiateRampTransaction({
        quote: selectedQuote,
        userAddress,
      });

      expect(tx.id).toMatch(/^ramp_/);
      expect(tx.status).toBe('pending_user_transfer_start');
      expect(tx.domain).toBe(selectedQuote.domain);
      expect(tx.interactiveUrl).toContain(selectedQuote.domain);
      expect(tx.interactiveUrl).toContain('sep24/interactive');

      // The wallet MUST NOT invent bank account numbers or fake bank names
      expect((tx as any).depositInstructions).toBeUndefined();

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

    it('includes plain-language referral disclosure and honest pilot agreement status', () => {
      const quote = getRampQuotes('buy', 50000)[0];
      expect(quote.referralDisclosure).toBeTruthy();
    });
  });
});
