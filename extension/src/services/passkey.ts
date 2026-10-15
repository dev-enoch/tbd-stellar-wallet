import { StrKey } from '@stellar/stellar-sdk';
import { PasskeySigner } from './signer';

export interface PasskeyCredential {
  credentialId: string;
  contractAddress: string;
  publicKeyBase64: string;
  createdAt: number;
  nickname: string;
  dailySponsoredCount: number;
  lastSponsoredDate: string; // YYYY-MM-DD
}

export interface FeeSponsorshipStatus {
  isSponsored: boolean;
  remainingDaily: number;
  dailyLimit: number;
  reason?: string;
}

const PASSKEY_ACCOUNTS_KEY = 'tbd_passkey_accounts';
const DAILY_SPONSORED_LIMIT = 5;

// Memory fallback store for universal environment support
let memoryPasskeys: PasskeyCredential[] = [];

export function getStoredPasskeys(): PasskeyCredential[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PASSKEY_ACCOUNTS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return memoryPasskeys;
}

export function saveStoredPasskeys(passkeys: PasskeyCredential[]): void {
  memoryPasskeys = [...passkeys];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PASSKEY_ACCOUNTS_KEY, JSON.stringify(passkeys));
    }
  } catch {
    // storage full
  }
}

/**
 * Checks if WebAuthn is available in the current execution environment.
 */
export function isWebAuthnSupported(): boolean {
  return typeof navigator !== 'undefined' && 'credentials' in navigator;
}

/**
 * Creates a deterministic Soroban contract account address for a passkey credential ID.
 * Soroban contract addresses start with 'C' and are 56 characters long.
 */
export function derivePasskeyContractAddress(credentialId: string): string {
  const seed = new Uint8Array(32);
  seed[0] = 0x50; // 'P'
  seed[1] = 0x41; // 'A'
  seed[2] = 0x53; // 'S'
  seed[3] = 0x53; // 'S'

  for (let i = 0; i < credentialId.length; i++) {
    seed[(i + 4) % 32] ^= credentialId.charCodeAt(i);
  }

  return StrKey.encodeContract(Buffer.from(seed));
}

/**
 * Creates a new WebAuthn Passkey credential and registers the smart account.
 */
export async function createPasskeyAccount(nickname: string = 'Passkey Smart Account'): Promise<{
  credential: PasskeyCredential;
  signer: PasskeySigner;
}> {
  let credentialId = '';
  let pubkeyBase64 = '';

  if (isWebAuthnSupported() && navigator.credentials.create) {
    try {
      const challenge = new Uint8Array(32);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(challenge);
      } else {
        challenge.fill(1);
      }

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Stellith Wallet',
            id: typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost',
          },
          user: {
            id: new Uint8Array(16).fill(1),
            name: nickname,
            displayName: nickname,
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256 (secp256r1)
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      })) as any;

      if (credential) {
        credentialId = credential.id;
        pubkeyBase64 = Buffer.from(credential.rawId).toString('base64');
      }
    } catch {
      // Fallback to deterministic simulated credential if user cancels or non-browser env
    }
  }

  if (!credentialId) {
    // Generate deterministic simulated passkey for automated testing or mock environments
    const randomBytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      randomBytes.fill(Date.now() & 0xff);
    }
    credentialId = `passkey_${Buffer.from(randomBytes).toString('hex')}`;
    pubkeyBase64 = Buffer.from(randomBytes).toString('base64');
  }

  const contractAddress = derivePasskeyContractAddress(credentialId);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const passkeyCredential: PasskeyCredential = {
    credentialId,
    contractAddress,
    publicKeyBase64: pubkeyBase64,
    createdAt: Date.now(),
    nickname,
    dailySponsoredCount: 0,
    lastSponsoredDate: dateStr,
  };

  const stored = getStoredPasskeys();
  stored.push(passkeyCredential);
  saveStoredPasskeys(stored);

  const signer = new PasskeySigner(contractAddress, credentialId);

  return {
    credential: passkeyCredential,
    signer,
  };
}

/**
 * Checks fee sponsorship eligibility for an account under PRD Section 8 abuse controls.
 */
export function checkFeeSponsorship(contractAddress: string): FeeSponsorshipStatus {
  const stored = getStoredPasskeys();
  const acc = stored.find((p) => p.contractAddress === contractAddress);

  if (!acc) {
    return {
      isSponsored: false,
      remainingDaily: 0,
      dailyLimit: DAILY_SPONSORED_LIMIT,
      reason: 'Standard accounts pay their own network fees',
    };
  }

  const today = new Date().toISOString().split('T')[0];
  if (acc.lastSponsoredDate !== today) {
    acc.dailySponsoredCount = 0;
    acc.lastSponsoredDate = today;
    saveStoredPasskeys(stored);
  }

  const remaining = Math.max(0, DAILY_SPONSORED_LIMIT - acc.dailySponsoredCount);

  if (remaining <= 0) {
    return {
      isSponsored: false,
      remainingDaily: 0,
      dailyLimit: DAILY_SPONSORED_LIMIT,
      reason: 'Daily sponsorship limit reached (5/5 transactions used today). You can pay the fee yourself.',
    };
  }

  return {
    isSponsored: true,
    remainingDaily: remaining,
    dailyLimit: DAILY_SPONSORED_LIMIT,
  };
}

/**
 * Records a sponsored transaction execution.
 */
export function recordSponsoredTransaction(contractAddress: string): void {
  const stored = getStoredPasskeys();
  const acc = stored.find((p) => p.contractAddress === contractAddress);
  if (acc) {
    const today = new Date().toISOString().split('T')[0];
    if (acc.lastSponsoredDate !== today) {
      acc.dailySponsoredCount = 1;
      acc.lastSponsoredDate = today;
    } else {
      acc.dailySponsoredCount += 1;
    }
    saveStoredPasskeys(stored);
  }
}

/**
 * Simulates relayer fee sponsorship by attaching a sponsor signature / fee bump.
 */
export async function sponsorTransaction(
  transactionXdr: string,
  _networkPassphrase: string,
  contractAddress: string
): Promise<{ sponsoredXdr: string; feePaidByApp: boolean }> {
  const status = checkFeeSponsorship(contractAddress);
  if (!status.isSponsored) {
    return {
      sponsoredXdr: transactionXdr,
      feePaidByApp: false,
    };
  }

  // Record sponsorship usage
  recordSponsoredTransaction(contractAddress);

  // Return sponsored transaction
  return {
    sponsoredXdr: transactionXdr,
    feePaidByApp: true,
  };
}
