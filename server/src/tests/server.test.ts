import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { db } from '../db';
import {
  Keypair,
  TransactionBuilder,
  Account,
  Operation,
  Asset,
} from '@stellar/stellar-sdk';
import { config } from '../config';

describe('Stellith Relayer & Backend Service', () => {
  beforeEach(() => {
    db.clearAll();
  });

  describe('Health Endpoint', () => {
    it('returns healthy status and relayer public key', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.relayerPublicKey).toBeTruthy();
      expect(res.body.dailySponsoredLimit).toBe(5);
    });
  });

  describe('Relayer Fee Sponsorship (PRD Section 8)', () => {
    it('checks eligibility and enforces daily 5/5 limits per account', async () => {
      const contractAddress = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

      // 1. Initial check: eligible with 5 remaining
      const checkRes = await request(app)
        .post('/api/sponsor/check')
        .send({ contractAddress });
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.eligible).toBe(true);
      expect(checkRes.body.remainingDaily).toBe(5);

      // Create dummy inner transaction
      const sender = Keypair.random();
      const account = new Account(sender.publicKey(), '100');

      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: Keypair.random().publicKey(),
            asset: Asset.native(),
            amount: '10',
          })
        )
        .setTimeout(30)
        .build();

      tx.sign(sender);
      const innerXdr = tx.toXDR();

      // 2. Sponsor 5 transactions successfully
      for (let i = 1; i <= 5; i++) {
        const signRes = await request(app)
          .post('/api/sponsor/sign')
          .send({ transactionXdr: innerXdr, contractAddress });

        expect(signRes.status).toBe(200);
        expect(signRes.body.success).toBe(true);
        expect(signRes.body.sponsoredXdr).toBeTruthy();
        expect(signRes.body.remainingDaily).toBe(5 - i);
      }

      // 3. 6th transaction should fail with 429
      const overLimitRes = await request(app)
        .post('/api/sponsor/sign')
        .send({ transactionXdr: innerXdr, contractAddress });

      expect(overLimitRes.status).toBe(429);
      expect(overLimitRes.body.success).toBe(false);
      expect(overLimitRes.body.error).toContain('limit of 5 sponsored transactions reached');
    });

    it('refuses to sponsor disallowed high-risk operations (fail-closed)', async () => {
      const contractAddress = 'CBZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';
      const sender = Keypair.random();
      const account = new Account(sender.publicKey(), '200');

      // AccountMerge is NOT in allowedOperations
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.accountMerge({
            destination: Keypair.random().publicKey(),
          })
        )
        .setTimeout(30)
        .build();

      tx.sign(sender);

      const res = await request(app)
        .post('/api/sponsor/sign')
        .send({ transactionXdr: tx.toXDR(), contractAddress });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Disallowed operation type');
    });
  });

  describe('Passkey Smart Account & Recovery (PRD Section 8)', () => {
    it('deploys a smart contract account and records metadata', async () => {
      const deployRes = await request(app)
        .post('/api/passkey/deploy-account')
        .send({
          credentialId: 'cred_device_alpha_123',
          publicKeyBase64: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...',
          nickname: 'Business Smart Account',
        });

      expect(deployRes.status).toBe(200);
      expect(deployRes.body.success).toBe(true);
      expect(deployRes.body.contractAddress).toMatch(/^C[A-Z0-9]{55}$/);
      expect(deployRes.body.rentFunded).toBe(true);

      const contractAddr = deployRes.body.contractAddress;

      // Add backup device for recovery
      const recoveryRes = await request(app)
        .post('/api/passkey/add-recovery')
        .send({
          contractAddress: contractAddr,
          recoveryCredentialId: 'cred_device_backup_laptop_456',
        });

      expect(recoveryRes.status).toBe(200);
      expect(recoveryRes.body.success).toBe(true);

      // Verify account registry
      const getRes = await request(app).get(`/api/passkey/account/${contractAddr}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.primaryCredentialId).toBe('cred_device_alpha_123');
      expect(getRes.body.recoveryCredentialIds).toContain('cred_device_backup_laptop_456');
    });
  });

  describe('SEP-24 Anchor Directory & Dynamic TOML Resolution (PRD Section 9)', () => {
    it('lists anchors with regulatory disclosures and pilot gate', async () => {
      const res = await request(app).get('/api/anchors');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const testAnchor = res.body.find((a: any) => a.id === 'testanchor');
      expect(testAnchor.isPilotApproved).toBe(true);

      const cowrywise = res.body.find((a: any) => a.id === 'cowrywise');
      expect(cowrywise.isPilotApproved).toBe(false); // Gated until real MoU
      expect(cowrywise.regulatoryStatus).toContain('ARIP');

      const yellowCard = res.body.find((a: any) => a.id === 'yellowcard');
      expect(yellowCard.regulatoryStatus).toContain('B2B Liquidity Rails Only');
    });

    it('resolves stellar.toml for sandbox anchor dynamically', async () => {
      const res = await request(app)
        .get('/api/anchors/toml')
        .query({ domain: 'testanchor.stellar.org' });

      expect(res.status).toBe(200);
      expect(res.body.transferServerSep0024).toContain('https://testanchor.stellar.org');
      expect(res.body.currencies).toContain('USDC');
    }, 15000);

    it('returns an authentic SEP-24 hosted URL without fabricating bank details', async () => {
      const res = await request(app)
        .post('/api/anchors/interactive-url')
        .send({
          domain: 'testanchor.stellar.org',
          assetCode: 'USDC',
          account: 'GDJLFK5PMOW6LHG4MWJ5PCDEAY2S7LALMQN5CXB2U75727O5R7B5QG6J',
        });

      expect(res.status).toBe(200);
      expect(res.body.url).toContain('https://testanchor.stellar.org');
      expect(res.body.id).toBeTruthy();
    }, 15000);
  });
});
