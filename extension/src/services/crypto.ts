import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@stellar/stellar-sdk';

import { Signer, LocalKeySigner, SignerType } from './signer';

export interface EncryptedKeystore {
  version: number;
  cipherText: string; // base64
  iv: string; // hex
  salt: string; // hex
  createdAt: number;
}

export interface DecryptedVault {
  mnemonic: string;
  accounts: {
    index: number;
    name: string;
    publicKey: string;
    type?: SignerType;
    bipPath?: string;
  }[];
  activeAccountIndex: number;
}

export interface DerivedAccount {
  index: number;
  name: string;
  publicKey: string;
  secretKey: string;
  keypair?: Keypair;
  type?: SignerType;
  signer?: Signer;
  bipPath?: string;
}

/**
 * Generates a standard 12-word BIP-39 mnemonic phrase.
 */
export function generateRecoveryPhrase(): string {
  return bip39.generateMnemonic(128); // 128 bits = 12 words
}

/**
 * Validates a recovery phrase against the BIP-39 wordlist.
 */
export function validateRecoveryPhrase(phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
  return bip39.validateMnemonic(normalized);
}

/**
 * Derives a Stellar keypair from a mnemonic using SEP-0005 standard path:
 * m/44'/148'/accountIndex'
 */
export async function deriveStellarKeypair(mnemonic: string, accountIndex: number = 0): Promise<DerivedAccount> {
  const seed = await bip39.mnemonicToSeed(mnemonic.trim().toLowerCase());
  const derivationPath = `m/44'/148'/${accountIndex}'`;
  const { key } = derivePath(derivationPath, seed.toString('hex'));
  
  // The derived 32-byte key is the raw Ed25519 seed for Stellar Keypair
  const keypair = Keypair.fromRawEd25519Seed(key);
  const signer = new LocalKeySigner(keypair);

  return {
    index: accountIndex,
    name: `Account ${accountIndex + 1}`,
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
    keypair,
    type: 'local',
    signer,
  };
}

/**
 * Derives a Keypair directly from a secret key (S...)
 */
export function fromSecretKey(secretKey: string): Keypair {
  return Keypair.fromSecret(secretKey.trim());
}

/**
 * Encrypts arbitrary vault data with a password using PBKDF2 (SHA-256) and AES-GCM 256-bit.
 */
export async function encryptVault(vault: DecryptedVault, password: string): Promise<EncryptedKeystore> {
  const enc = new TextEncoder();
  const rawData = enc.encode(JSON.stringify(vault));
  
  // Generate random salt (16 bytes) and IV (12 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key using PBKDF2
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    aesKey,
    rawData
  );

  // Convert to serializable format
  const cipherBase64 = bufferToBase64(new Uint8Array(cipherBuffer));
  const ivHex = bufferToHex(iv);
  const saltHex = bufferToHex(salt);

  return {
    version: 1,
    cipherText: cipherBase64,
    iv: ivHex,
    salt: saltHex,
    createdAt: Date.now(),
  };
}

/**
 * Decrypts the encrypted keystore back to vault data with the password.
 */
export async function decryptVault(keystore: EncryptedKeystore, password: string): Promise<DecryptedVault> {
  const enc = new TextEncoder();
  const salt = hexToBuffer(keystore.salt);
  const iv = hexToBuffer(keystore.iv);
  const cipherData = base64ToBuffer(keystore.cipherText);

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      aesKey,
      cipherData as unknown as BufferSource
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBuffer);
    return JSON.parse(jsonStr) as DecryptedVault;
  } catch {
    throw new Error('Invalid password or corrupted keystore');
  }
}

// Helpers
function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
