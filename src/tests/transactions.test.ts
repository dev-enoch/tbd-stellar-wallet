import { describe, it, expect } from 'vitest';
import { validateMemo, checkMemoRequirement } from '../services/transactions';

describe('Transaction & Payment Service', () => {
  it('validates memo values accurately', () => {
    // Valid text memo
    expect(validateMemo('text', 'Payment for work')).toBeNull();
    // Too long text memo (> 28 bytes)
    expect(validateMemo('text', 'This is a very long memo text that exceeds twenty-eight bytes')).toContain('too long');

    // Valid numeric ID memo
    expect(validateMemo('id', '123456789')).toBeNull();
    // Invalid ID memo (non-numeric)
    expect(validateMemo('id', 'abc')).toContain('positive number');

    // Valid 32-byte (64 hex characters) hash memo
    const validHash = 'a'.repeat(64);
    expect(validateMemo('hash', validHash)).toBeNull();
    // Invalid hash length
    expect(validateMemo('hash', '1234')).toContain('64 hex');
  });

  it('detects SEP-29 memo requirements on known exchange destinations', () => {
    const exchangeAddress = 'GABT54O3L4B52L6U3Y5XZZ7K7U7N7J2G2H3K4L5M6N7P8Q9R0S1T2U3V';
    expect(checkMemoRequirement(exchangeAddress)).toBe(true);

    const regularAddress = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
    expect(checkMemoRequirement(regularAddress)).toBe(false);
  });
});
