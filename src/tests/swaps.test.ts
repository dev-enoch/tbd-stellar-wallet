import { describe, it, expect } from 'vitest';
import { getSwapQuote } from '../services/swaps';

describe('DEX Swaps Service', () => {
  it('calculates swap quotes and minimum received with slippage tolerance', async () => {
    const dummyAddress = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
    const quote = await getSwapQuote(
      'XLM',
      undefined,
      'USDC',
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      '100',
      1.0, // 1% slippage
      dummyAddress,
      'testnet'
    );

    expect(quote.fromAssetCode).toBe('XLM');
    expect(quote.toAssetCode).toBe('USDC');
    expect(parseFloat(quote.expectedOutput)).toBeGreaterThan(0);

    // Verify minimum received reflects 1% slippage
    const expected = parseFloat(quote.expectedOutput);
    const minReceived = parseFloat(quote.minimumReceived);
    expect(minReceived).toBeLessThanOrEqual(expected);
    expect(minReceived).toBeCloseTo(expected * 0.99, 1);

    expect(quote.expiresInSeconds).toBe(30);
  }, 15000);
});
