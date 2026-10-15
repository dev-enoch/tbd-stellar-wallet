import { describe, it, expect } from 'vitest';
import { scanTransaction, ScanParams } from '../services/scanning';

describe('Malicious Transaction Scanning Service (PRD Section 4)', () => {
  it('returns safe verdict for legitimate transactions', async () => {
    const params: ScanParams = {
      destination: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2G2WVOEFHS2GF2PD4NXOX',
      assetCode: 'XLM',
      amount: '50',
      memo: 'Invoice 104',
      enabled: true,
    };

    const res = await scanTransaction(params);
    expect(res.verdict).toBe('safe');
    expect(res.findings.length).toBe(0);
    expect(res.latencyMs).toBeLessThanOrEqual(1000);
  });

  it('blocks transactions targeting known malicious drainer accounts', async () => {
    const params: ScanParams = {
      destination: 'GDKNOWNBADSCAMDRAINERACCOUNTFORTESTING99',
      assetCode: 'XLM',
      amount: '1000',
      enabled: true,
    };

    const res = await scanTransaction(params);
    expect(res.verdict).toBe('blocked');
    expect(res.findings.some((f) => f.category === 'phishing')).toBe(true);
    expect(res.findings.some((f) => f.severity === 'critical')).toBe(true);
  });

  it('flags suspicious airdrop and scam memo patterns with warning', async () => {
    const params: ScanParams = {
      destination: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2G2WVOEFHS2GF2PD4NXOX',
      assetCode: 'XLM',
      amount: '1',
      memo: 'claim airdrop at scam-link.com',
      enabled: true,
    };

    const res = await scanTransaction(params);
    expect(res.verdict).toBe('warning');
    expect(res.findings.some((f) => f.category === 'memo_scam')).toBe(true);
  });

  it('detects counterfeit token issuers mimicking major stablecoins', async () => {
    const params: ScanParams = {
      destination: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2G2WVOEFHS2GF2PD4NXOX',
      assetCode: 'USDC',
      assetIssuer: 'GFAKE_UNAUTHORIZED_COUNTERFEIT_ISSUER_12345',
      amount: '100',
      enabled: true,
    };

    const res = await scanTransaction(params);
    expect(res.verdict).toBe('warning');
    expect(res.findings.some((f) => f.category === 'deceptive_asset')).toBe(true);
  });

  it('flags swaps with extreme price impact and slippage drain', async () => {
    const params: ScanParams = {
      assetCode: 'AQUA',
      amount: '500',
      priceImpact: 6.5,
      enabled: true,
    };

    const res = await scanTransaction(params);
    expect(res.verdict).toBe('blocked');
    expect(res.findings.some((f) => f.category === 'slippage')).toBe(true);
  });

  it('returns disabled verdict when threat scanning is toggled off in settings', async () => {
    const params: ScanParams = {
      destination: 'GDKNOWNBADSCAMDRAINERACCOUNTFORTESTING99',
      enabled: false,
    };

    const res = await scanTransaction(params);
    expect(res.verdict).toBe('disabled');
    expect(res.provider).toBe('Disabled');
  });

  it('enforces fail-warn policy: returns unavailable upon timeout rather than silently approving', async () => {
    const params: ScanParams = {
      destination: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2G2WVOEFHS2GF2PD4NXOX',
      enabled: true,
      mockTimeout: true,
      bypassCache: true,
    };

    const res = await scanTransaction(params);
    expect(res.verdict).toBe('unavailable');
    expect(res.title).toContain('Could not check this transaction');
    expect(res.findings.length).toBeGreaterThan(0);
  });
});
