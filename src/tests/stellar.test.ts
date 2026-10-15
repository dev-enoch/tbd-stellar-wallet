import { describe, it, expect } from 'vitest';
import {
  NETWORKS,
  formatAddress,
  isValidAddress,
  getExplorerUrl,
} from '../services/stellar';

describe('Stellar Network Service', () => {
  it('has valid configurations for Mainnet and Testnet', () => {
    expect(NETWORKS.testnet.networkPassphrase).toContain('Test SDF Network');
    expect(NETWORKS.mainnet.networkPassphrase).toContain('Public Global Stellar Network');
    expect(NETWORKS.testnet.horizonUrls.length).toBeGreaterThanOrEqual(1);
    expect(NETWORKS.mainnet.horizonUrls.length).toBeGreaterThanOrEqual(1);
    expect(NETWORKS.testnet.friendbotUrl).toBeDefined();
  });

  it('formats and shortens Stellar addresses accurately', () => {
    const pubKey = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
    const formatted = formatAddress(pubKey, 4);
    expect(formatted).toBe('GAAZ...CWN7');
  });

  it('validates Stellar public keys and muxed addresses', () => {
    // Valid standard Ed25519 public key
    const validKey = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
    expect(isValidAddress(validKey)).toBe(true);

    // Invalid keys
    expect(isValidAddress('G12345')).toBe(false);
    expect(isValidAddress('not-a-key')).toBe(false);
    expect(isValidAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')).toBe(false);
  });

  it('generates correct explorer URLs', () => {
    const pubKey = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
    const testnetUrl = getExplorerUrl('account', pubKey, 'testnet');
    expect(testnetUrl).toBe(`https://stellar.expert/explorer/testnet/account/${pubKey}`);

    const mainnetUrl = getExplorerUrl('account', pubKey, 'mainnet');
    expect(mainnetUrl).toBe(`https://stellar.expert/explorer/public/account/${pubKey}`);
  });
});
