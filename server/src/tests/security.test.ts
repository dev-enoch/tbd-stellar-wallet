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

describe('Relayer Anti-Drain & Cryptographic Security Attacks', () => {
  beforeEach(() => {
    db.clearAll();
  });

  describe('Attack Vector 1: Relayer Source Account Theft & Asset Drain', () => {
    it('rejects an inner transaction attempting to use the relayer account as the transaction source', async () => {
      const relayerPubkey = config.relayerKeypair.publicKey();
      const account = new Account(relayerPubkey, '100');

      // Attacker constructs a tx where inner source is the relayer!
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: Keypair.random().publicKey(),
            asset: Asset.native(),
            amount: '50',
          })
        )
        .setTimeout(30)
        .build();

      const res = await request(app)
        .post('/api/sponsor/sign')
        .send({
          transactionXdr: tx.toXDR(),
          contractAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Inner transaction source cannot be the relayer account');
    });

    it('rejects a transaction attempting to debit the relayer account via operation-level source hijacking', async () => {
      const attacker = Keypair.random();
      const account = new Account(attacker.publicKey(), '100');
      const relayerPubkey = config.relayerKeypair.publicKey();

      // Attacker is tx source, but specifies relayer as payment source!
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            source: relayerPubkey, // ATTEMPTED RELAYER DRAIN
            destination: attacker.publicKey(),
            asset: Asset.native(),
            amount: '1000',
          })
        )
        .setTimeout(30)
        .build();

      tx.sign(attacker);

      const res = await request(app)
        .post('/api/sponsor/sign')
        .send({
          transactionXdr: tx.toXDR(),
          contractAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('attempts to debit or use relayer as source');
    });
  });

  describe('Attack Vector 2: Exorbitant Base Fee & Resource Exhaustion', () => {
    it('rejects transactions requesting fees above the maximum sponsored cap', async () => {
      const sender = Keypair.random();
      const account = new Account(sender.publicKey(), '200');

      // Attacker requests 50,000 stroops fee (cap is 5,000)
      const tx = new TransactionBuilder(account, {
        fee: '50000',
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: Keypair.random().publicKey(),
            asset: Asset.native(),
            amount: '1',
          })
        )
        .setTimeout(30)
        .build();

      tx.sign(sender);

      const res = await request(app)
        .post('/api/sponsor/sign')
        .send({
          transactionXdr: tx.toXDR(),
          contractAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('exceeds maximum sponsored cap');
    });
  });

  describe('Attack Vector 3: Sybil IP Exhaustion of the 10 XLM Pool', () => {
    it('enforces IP-level daily caps even when attacker generates unique contract addresses', async () => {
      const clientIp = '198.51.100.42';
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
            amount: '1',
          })
        )
        .setTimeout(30)
        .build();
      tx.sign(sender);
      const xdr = tx.toXDR();

      // Attacker spins up 10 different contract addresses from the same IP
      for (let i = 1; i <= 10; i++) {
        const addr = `C${i.toString().padStart(55, '0')}`;
        const res = await request(app)
          .post('/api/sponsor/sign')
          .set('X-Forwarded-For', clientIp)
          .send({ transactionXdr: xdr, contractAddress: addr });

        expect(res.status).toBe(200);
      }

      // 11th request from same IP must be BLOCKED by IP anti-drain limit
      const blockedRes = await request(app)
        .post('/api/sponsor/sign')
        .set('X-Forwarded-For', clientIp)
        .send({
          transactionXdr: xdr,
          contractAddress: 'C999999999999999999999999999999999999999999999999999999',
        });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toContain('Daily IP rate limit');
    });
  });

  describe('Attack Vector 4: Deploy Account Spam (Rent Reserve Drain)', () => {
    it('blocks excessive smart account deployment calls from the same IP', async () => {
      const clientIp = '203.0.113.19';

      // 1st deploy succeeds
      const res1 = await request(app)
        .post('/api/passkey/deploy-account')
        .set('X-Forwarded-For', clientIp)
        .send({ credentialId: 'cred_1', publicKeyBase64: 'key1' });
      expect(res1.status).toBe(200);

      // 2nd deploy succeeds
      const res2 = await request(app)
        .post('/api/passkey/deploy-account')
        .set('X-Forwarded-For', clientIp)
        .send({ credentialId: 'cred_2', publicKeyBase64: 'key2' });
      expect(res2.status).toBe(200);

      // 3rd deploy must be rejected with 429
      const res3 = await request(app)
        .post('/api/passkey/deploy-account')
        .set('X-Forwarded-For', clientIp)
        .send({ credentialId: 'cred_3', publicKeyBase64: 'key3' });
      expect(res3.status).toBe(429);
      expect(res3.body.error).toContain('IP deployment limit of 2 accounts reached');
    });
  });

  describe('Attack Vector 5: Unauthorized Passkey Recovery Signer Modification', () => {
    it('rejects adding a recovery signer without cryptographic authorization from the primary passkey', async () => {
      // Deploy legitimate smart account
      const deployRes = await request(app)
        .post('/api/passkey/deploy-account')
        .send({ credentialId: 'primary_key_alpha', publicKeyBase64: 'pubkey_alpha' });
      const contractAddress = deployRes.body.contractAddress;

      // Attacker attempts to add their own recovery key without authorization signature
      const attackRes = await request(app)
        .post('/api/passkey/add-recovery')
        .send({
          contractAddress,
          recoveryCredentialId: 'attacker_stolen_device',
          // missing existingSignerAuthSignature!
        });

      expect(attackRes.status).toBe(401);
      expect(attackRes.body.error).toContain('Cryptographic authorization required');

      // Valid authorized update succeeds
      const validRes = await request(app)
        .post('/api/passkey/add-recovery')
        .send({
          contractAddress,
          recoveryCredentialId: 'authorized_backup_phone',
          existingSignerAuthSignature: 'sig_valid_webauthn_secp256r1_hash',
        });

      expect(validRes.status).toBe(200);
      expect(validRes.body.success).toBe(true);
    });
  });

  describe('Zero-XLM Passkey Smart Account Invocation Relay (PRD Section 8)', () => {
    it('allows a brand new smart account with zero native XLM to execute contract calls via relayer submission', async () => {
      const contractAddress = 'CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526';

      const res = await request(app)
        .post('/api/sponsor/relay-invocation')
        .set('X-Forwarded-For', '198.51.100.99')
        .send({
          contractAddress,
          functionName: 'transfer',
          authEntries: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sponsoredXdr).toBeTruthy();
    });
  });
});
