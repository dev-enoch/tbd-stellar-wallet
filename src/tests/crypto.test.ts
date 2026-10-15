import { describe, it, expect } from 'vitest';
import {
  generateRecoveryPhrase,
  validateRecoveryPhrase,
  deriveStellarKeypair,
  encryptVault,
  decryptVault,
  DecryptedVault,
} from '../services/crypto';
import { StrKey } from '@stellar/stellar-sdk';

describe('Cryptographic Keystore Service', () => {
  it('generates a valid 12-word recovery phrase', () => {
    const phrase = generateRecoveryPhrase();
    const words = phrase.split(' ');
    expect(words.length).toBe(12);
    expect(validateRecoveryPhrase(phrase)).toBe(true);
  });

  it('rejects invalid recovery phrases', () => {
    expect(validateRecoveryPhrase('not a valid phrase')).toBe(false);
    expect(validateRecoveryPhrase('apple banana cherry')).toBe(false);
  });

  it('derives standard Stellar public and secret keys from phrase', async () => {
    // Known test vector
    const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    expect(validateRecoveryPhrase(phrase)).toBe(true);

    const account0 = await deriveStellarKeypair(phrase, 0);
    expect(account0.publicKey.startsWith('G')).toBe(true);
    expect(account0.secretKey.startsWith('S')).toBe(true);
    expect(StrKey.isValidEd25519PublicKey(account0.publicKey)).toBe(true);
    expect(StrKey.isValidEd25519SecretSeed(account0.secretKey)).toBe(true);

    const account1 = await deriveStellarKeypair(phrase, 1);
    expect(account1.publicKey.startsWith('G')).toBe(true);
    expect(account1.publicKey).not.toBe(account0.publicKey);
  });

  it('encrypts and decrypts vault securely with password', async () => {
    const vault: DecryptedVault = {
      mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      accounts: [
        { index: 0, name: 'Main Account', publicKey: 'GB...mock' }
      ],
      activeAccountIndex: 0,
    };

    const password = 'CorrectPassword123!';
    const encrypted = await encryptVault(vault, password);

    expect(encrypted.cipherText).toBeDefined();
    expect(encrypted.iv.length).toBe(24); // 12 bytes hex
    expect(encrypted.salt.length).toBe(32); // 16 bytes hex

    // Decrypt with correct password
    const decrypted = await decryptVault(encrypted, password);
    expect(decrypted.mnemonic).toBe(vault.mnemonic);
    expect(decrypted.accounts.length).toBe(1);

    // Reject incorrect password
    await expect(decryptVault(encrypted, 'WrongPassword456!')).rejects.toThrow();
  });
});
