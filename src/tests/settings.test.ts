import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/storage';
import {
  encryptVault,
  decryptVault,
  deriveStellarKeypair,
  generateRecoveryPhrase,
  DecryptedVault,
} from '../services/crypto';

// Simple memory storage mock for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    length: 0,
    key: () => null,
  };
}

if (typeof globalThis.sessionStorage === 'undefined') {
  let sessionStore: Record<string, string> = {};
  globalThis.sessionStorage = {
    getItem: (key: string) => sessionStore[key] || null,
    setItem: (key: string, value: string) => {
      sessionStore[key] = value;
    },
    removeItem: (key: string) => {
      delete sessionStore[key];
    },
    clear: () => {
      sessionStore = {};
    },
    length: 0,
    key: () => null,
  };
}

describe('Settings, Preferences & Vault Security', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('persists and updates network, currency, and auto-lock preferences', async () => {
    const defaultPrefs = await storage.getPreferences();
    expect(defaultPrefs.network).toBe('testnet');
    expect(defaultPrefs.currency).toBe('USD');
    expect(defaultPrefs.autoLockMinutes).toBe(15);

    // Update currency to NGN and autoLock to 30m
    await storage.setPreferences({ currency: 'NGN', autoLockMinutes: 30 });
    const updated = await storage.getPreferences();
    expect(updated.currency).toBe('NGN');
    expect(updated.autoLockMinutes).toBe(30);
    expect(updated.network).toBe('testnet'); // unchanged

    // Switch network to mainnet
    await storage.setPreferences({ network: 'mainnet' });
    const mainnetPrefs = await storage.getPreferences();
    expect(mainnetPrefs.network).toBe('mainnet');
  });

  it('manages connected dApp origins and allows granular revocation', async () => {
    const site1 = {
      origin: 'https://soroswap.finance',
      connectedAt: Date.now(),
      accountPublicKey: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7',
    };
    const site2 = {
      origin: 'https://stellarx.com',
      connectedAt: Date.now() + 1000,
      accountPublicKey: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7',
    };

    await storage.setPreferences({ connectedSites: [site1, site2] });
    let prefs = await storage.getPreferences();
    expect(prefs.connectedSites.length).toBe(2);

    // Revoke site1
    const filtered = prefs.connectedSites.filter((s) => s.origin !== 'https://soroswap.finance');
    await storage.setPreferences({ connectedSites: filtered });

    prefs = await storage.getPreferences();
    expect(prefs.connectedSites.length).toBe(1);
    expect(prefs.connectedSites[0].origin).toBe('https://stellarx.com');

    // Revoke all
    await storage.setPreferences({ connectedSites: [] });
    prefs = await storage.getPreferences();
    expect(prefs.connectedSites.length).toBe(0);
  });

  it('safely exposes recovery phrase upon password verification and fails on wrong password', async () => {
    const mnemonic = generateRecoveryPhrase();
    const primaryAccount = await deriveStellarKeypair(mnemonic, 0);
    const vault: DecryptedVault = {
      mnemonic,
      accounts: [
        {
          index: 0,
          name: 'Main Account',
          publicKey: primaryAccount.publicKey,
        },
      ],
      activeAccountIndex: 0,
    };

    const password = 'SuperSecretPassword123!';
    const encrypted = await encryptVault(vault, password);

    // Decrypt with correct password
    const decrypted = await decryptVault(encrypted, password);
    expect(decrypted.mnemonic).toBe(mnemonic);
    expect(decrypted.mnemonic.split(' ').length).toBe(12);

    // Decrypt with wrong password fails
    await expect(decryptVault(encrypted, 'WrongPassword999!')).rejects.toThrow();
  });

  it('resets wallet by wiping keystore and returning clean state', async () => {
    const mnemonic = generateRecoveryPhrase();
    const vault: DecryptedVault = {
      mnemonic,
      accounts: [],
      activeAccountIndex: 0,
    };
    const encrypted = await encryptVault(vault, 'Pass123!');
    await storage.setKeystore(encrypted);

    let current = await storage.getKeystore();
    expect(current).not.toBeNull();

    // Reset wallet
    await storage.removeKeystore();
    current = await storage.getKeystore();
    expect(current).toBeNull();
  });

  it('manages session auth persistence for auto-lock timeout across popup closes', async () => {
    // Initial state is null
    let session = await storage.getSessionAuth();
    expect(session).toBeNull();

    // Set session auth
    const now = Date.now();
    await storage.setSessionAuth({
      password: 'MockPassword123!',
      lastActive: now,
    });

    session = await storage.getSessionAuth();
    expect(session).not.toBeNull();
    expect(session?.password).toBe('MockPassword123!');
    expect(session?.lastActive).toBe(now);

    // Update session activity
    await storage.updateSessionActivity();
    const updatedSession = await storage.getSessionAuth();
    expect(updatedSession?.lastActive).toBeGreaterThanOrEqual(now);

    // Clear session auth on explicit lock or reset
    await storage.clearSessionAuth();
    session = await storage.getSessionAuth();
    expect(session).toBeNull();
  });
});

