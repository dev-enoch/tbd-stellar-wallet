import { describe, it, expect, beforeEach } from 'vitest';
import {
  derivePasskeyContractAddress,
  createPasskeyAccount,
  checkFeeSponsorship,
  sponsorTransaction,
  getStoredPasskeys,
  saveStoredPasskeys,
} from '../services/passkey';
import { PasskeySigner } from '../services/signer';
import { StrKey } from '@stellar/stellar-sdk';

describe('Passkey Smart Account & Sponsored Fees Service (PRD Section 8)', () => {
  beforeEach(() => {
    saveStoredPasskeys([]);
  });

  describe('Contract Address Derivation', () => {
    it('generates a valid 56-character Soroban contract address starting with C', () => {
      const credentialId = 'test_credential_webauthn_12345';
      const address = derivePasskeyContractAddress(credentialId);

      expect(address).toMatch(/^C[A-Z0-9]{55}$/);
      expect(StrKey.isValidContract(address)).toBe(true);
    });

    it('derives deterministic addresses for the same credential ID', () => {
      const id = 'my_biometric_key_device_1';
      const addr1 = derivePasskeyContractAddress(id);
      const addr2 = derivePasskeyContractAddress(id);
      expect(addr1).toEqual(addr2);
    });

    it('derives distinct addresses for different credentials', () => {
      const addr1 = derivePasskeyContractAddress('cred_a');
      const addr2 = derivePasskeyContractAddress('cred_b');
      expect(addr1).not.toEqual(addr2);
    });
  });

  describe('Passkey Account Creation', () => {
    it('creates a passkey credential and initializes PasskeySigner', async () => {
      const res = await createPasskeyAccount('Personal Passkey');

      expect(res.credential.nickname).toBe('Personal Passkey');
      expect(res.credential.contractAddress).toMatch(/^C[A-Z0-9]{55}$/);
      expect(res.signer).toBeInstanceOf(PasskeySigner);
      expect(res.signer.type).toBe('passkey');
      expect(res.signer.capabilities.isContractAccount).toBe(true);
      expect(res.signer.capabilities.requiresUserPresence).toBe(true);

      const stored = getStoredPasskeys();
      expect(stored.length).toBe(1);
      expect(stored[0].contractAddress).toBe(res.credential.contractAddress);
    });
  });

  describe('Fee Sponsorship Abuse Controls (PRD Section 8)', () => {
    it('allows up to 5 sponsored transactions per day per passkey account', async () => {
      const { credential } = await createPasskeyAccount('Daily Sponsorship Test');
      const contractAddress = credential.contractAddress;

      // Initial state: 5 remaining
      let status = checkFeeSponsorship(contractAddress);
      expect(status.isSponsored).toBe(true);
      expect(status.remainingDaily).toBe(5);

      // Perform 5 sponsored transactions
      for (let i = 1; i <= 5; i++) {
        const result = await sponsorTransaction('sample_tx_xdr', 'Test SDF Network ; September 2015', contractAddress);
        expect(result.feePaidByApp).toBe(true);

        const currentStatus = checkFeeSponsorship(contractAddress);
        expect(currentStatus.remainingDaily).toBe(5 - i);
      }

      // 6th transaction must be rejected from sponsorship (must fallback to self-pay)
      status = checkFeeSponsorship(contractAddress);
      expect(status.isSponsored).toBe(false);
      expect(status.remainingDaily).toBe(0);
      expect(status.reason).toContain('Daily sponsorship limit reached');

      const overflowResult = await sponsorTransaction('sample_tx_xdr', 'Test SDF Network ; September 2015', contractAddress);
      expect(overflowResult.feePaidByApp).toBe(false);
    });

    it('rejects sponsorship for unmanaged or standard accounts', () => {
      const standardGAddress = 'GDJLFK5PMOW6LHG4MWJ5PCDEAY2S7LALMQN5CXB2U75727O5R7B5QG6J';
      const status = checkFeeSponsorship(standardGAddress);
      expect(status.isSponsored).toBe(false);
      expect(status.reason).toContain('Standard accounts pay their own network fees');
    });

    it('resets the daily count when the calendar date advances', async () => {
      const { credential } = await createPasskeyAccount('Date Reset Test');
      const contractAddress = credential.contractAddress;

      // Simulate 5 uses yesterday
      const stored = getStoredPasskeys();
      const account = stored.find((p) => p.contractAddress === contractAddress)!;
      account.dailySponsoredCount = 5;
      account.lastSponsoredDate = '2026-10-14';
      saveStoredPasskeys(stored);

      // Checking today should auto-reset count to 0 and allow 5
      const status = checkFeeSponsorship(contractAddress);
      expect(status.isSponsored).toBe(true);
      expect(status.remainingDaily).toBe(5);
    });
  });
});
