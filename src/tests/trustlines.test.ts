import { describe, it, expect } from 'vitest';
import { VERIFIED_ASSETS, searchCuratedAssets } from '../services/trustlines';

describe('Trustlines & Asset Management Service', () => {
  it('contains curated verified assets for Mainnet and Testnet', () => {
    expect(VERIFIED_ASSETS.mainnet.length).toBeGreaterThanOrEqual(3);
    expect(VERIFIED_ASSETS.testnet.length).toBeGreaterThanOrEqual(2);

    const usdc = VERIFIED_ASSETS.mainnet.find((a) => a.code === 'USDC');
    expect(usdc).toBeDefined();
    expect(usdc?.verified).toBe(true);
    expect(usdc?.domain).toBe('circle.com');
  });

  it('filters curated assets by search term correctly', () => {
    const usdcResults = searchCuratedAssets('usdc', 'mainnet');
    expect(usdcResults.length).toBe(1);
    expect(usdcResults[0].code).toBe('USDC');

    const aquaResults = searchCuratedAssets('aquarius', 'mainnet');
    expect(aquaResults.length).toBe(1);
    expect(aquaResults[0].code).toBe('AQUA');

    const noResults = searchCuratedAssets('xyznonexistenttoken', 'mainnet');
    expect(noResults.length).toBe(0);
  });
});
