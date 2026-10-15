import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStellarBip44Path,
  deriveDeterministicLedgerPubkey,
  connectLedger,
  verifyAddressOnDevice,
  signWithLedger,
  setSimulatedLedgerState,
  containsSorobanContractCall,
} from '../services/ledger';
import { LedgerSigner } from '../services/signer';
import {
  Keypair,
  TransactionBuilder,
  Account,
  Operation,
  Asset,
  Networks,
  xdr,
  StrKey,
  Address,
} from '@stellar/stellar-sdk';

describe('Ledger Hardware Wallet Service', () => {
  beforeEach(() => {
    // Reset simulated device state before each test
    setSimulatedLedgerState({
      connected: true,
      locked: false,
      appClosed: false,
    });
  });

  describe('Derivation & Key Generation', () => {
    it('generates standard BIP-44 Stellar derivation paths', () => {
      expect(getStellarBip44Path(0)).toBe("44'/148'/0'");
      expect(getStellarBip44Path(1)).toBe("44'/148'/1'");
      expect(getStellarBip44Path(5)).toBe("44'/148'/5'");
    });

    it('derives valid and deterministic Stellar public keys for indices', () => {
      const pubkey0 = deriveDeterministicLedgerPubkey(0);
      const pubkey1 = deriveDeterministicLedgerPubkey(1);

      expect(pubkey0).toMatch(/^G[A-Z0-9]{55}$/);
      expect(pubkey1).toMatch(/^G[A-Z0-9]{55}$/);
      expect(pubkey0).not.toBe(pubkey1);

      // Determinism check
      expect(deriveDeterministicLedgerPubkey(0)).toBe(pubkey0);
    });
  });

  describe('Connection & Device State Checks', () => {
    it('connects successfully to Ledger device when ready', async () => {
      const dev = await connectLedger();
      expect(dev.status).toBe('connected');
      expect(dev.vendorId).toBe(0x2c97);
    });

    it('fails with device_locked error when device is PIN locked', async () => {
      setSimulatedLedgerState({ locked: true });
      await expect(connectLedger()).rejects.toThrow(/locked/i);
    });

    it('fails with app_not_open error when Stellar app is closed', async () => {
      setSimulatedLedgerState({ appClosed: true });
      await expect(connectLedger()).rejects.toThrow(/not open/i);
    });
  });

  describe('On-Device Address Verification', () => {
    it('verifies address match on device screen', async () => {
      const pubkey = deriveDeterministicLedgerPubkey(0);
      const verified = await verifyAddressOnDevice("44'/148'/0'", pubkey);
      expect(verified).toBe(true);
    });

    it('fails verification if device is locked', async () => {
      setSimulatedLedgerState({ locked: true });
      const pubkey = deriveDeterministicLedgerPubkey(0);
      await expect(verifyAddressOnDevice("44'/148'/0'", pubkey)).rejects.toThrow(/locked/i);
    });
  });

  describe('Transaction Signing & Blind Signing Enforcement', () => {
    const dummySource = Keypair.random();
    const dest = Keypair.random();

    function buildClassicTx(): string {
      const account = new Account(dummySource.publicKey(), '100');
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: dest.publicKey(),
            asset: Asset.native(),
            amount: '10',
          })
        )
        .setTimeout(30)
        .build();

      return tx.toXDR();
    }

    it('successfully signs classic payment on device', async () => {
      const xdr = buildClassicTx();
      const signedXdr = await signWithLedger(xdr, Networks.TESTNET, "44'/148'/0'");
      expect(signedXdr).toBeDefined();

      const parsed = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      expect(parsed.signatures.length).toBeGreaterThan(0);
    });

    it('identifies classic transactions as not containing Soroban contract calls', () => {
      const xdr = buildClassicTx();
      expect(containsSorobanContractCall(xdr, Networks.TESTNET)).toBe(false);
    });

    function buildSorobanContractTx(): string {
      const contractId = StrKey.encodeContract(Buffer.alloc(32));
      const addr = new Address(contractId);
      const hf = xdr.HostFunction.hostFunctionTypeInvokeContract(
        new xdr.InvokeContractArgs({
          contractAddress: addr.toScAddress(),
          functionName: 'testMethod',
          args: [],
        })
      );
      const op = Operation.invokeHostFunction({ func: hf, auth: [] });

      const account = new Account(dummySource.publicKey(), '100');
      const contractTx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();

      return contractTx.toXDR();
    }

    it('blocks Soroban contract blind signing when allowBlindSigning is false', async () => {
      const xdrString = buildSorobanContractTx();

      expect(containsSorobanContractCall(xdrString, Networks.TESTNET)).toBe(true);

      await expect(
        signWithLedger(xdrString, Networks.TESTNET, "44'/148'/0'", {
          allowBlindSigning: false,
        })
      ).rejects.toThrow(/blind signing/i);
    });

    it('allows Soroban contract signing when allowBlindSigning is explicitly enabled', async () => {
      const xdrString = buildSorobanContractTx();

      const signed = await signWithLedger(xdrString, Networks.TESTNET, "44'/148'/0'", {
        allowBlindSigning: true,
      });
      expect(signed).toBeDefined();
    });
  });

  describe('LedgerSigner Class', () => {
    it('properly configures capabilities and signs via Signer abstraction', async () => {
      const pubkey = deriveDeterministicLedgerPubkey(0);
      const signer = new LedgerSigner(pubkey, "44'/148'/0'", false);

      expect(signer.type).toBe('ledger');
      expect(signer.publicKey).toBe(pubkey);
      expect(signer.capabilities.isHardware).toBe(true);
      expect(signer.capabilities.showsReadableDetailsOnDevice).toBe(true);
      expect(signer.capabilities.canSignSorobanAuth).toBe(false);

      const dummySource = Keypair.random();
      const account = new Account(dummySource.publicKey(), '100');
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: Keypair.random().publicKey(),
            asset: Asset.native(),
            amount: '5',
          })
        )
        .setTimeout(30)
        .build();

      const signedXdr = await signer.signTransaction(tx.toXDR(), Networks.TESTNET);
      expect(signedXdr).toBeDefined();

      const verified = await signer.verifyAddressOnDevice();
      expect(verified).toBe(true);
    });
  });
});
