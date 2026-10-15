import { describe, it, expect } from 'vitest';
import { Keypair, TransactionBuilder, Account, Operation, Asset, BASE_FEE } from '@stellar/stellar-sdk';
import { LocalKeySigner, LedgerSigner, PasskeySigner, Signer } from '../services/signer';
import { NETWORKS } from '../services/stellar';

describe('Account Abstraction Signers (PRD Section 3.1)', () => {
  const testKp = Keypair.random();
  const networkPassphrase = NETWORKS.testnet.networkPassphrase;

  it('LocalKeySigner signs classic Stellar transactions', async () => {
    const signer = new LocalKeySigner(testKp);
    expect(signer.type).toBe('local');
    expect(signer.publicKey).toBe(testKp.publicKey());
    expect(signer.capabilities.canSignClassic).toBe(true);
    expect(signer.capabilities.canSignSorobanAuth).toBe(true);
    expect(signer.capabilities.isHardware).toBe(false);
    expect(signer.capabilities.isContractAccount).toBe(false);

    // Build dummy transaction
    const sourceAccount = new Account(testKp.publicKey(), '1000');
    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase,
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

    const signedXdr = await signer.signTransaction(tx.toXDR(), networkPassphrase);
    expect(signedXdr).toBeDefined();

    const restoredTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    expect(restoredTx.signatures.length).toBe(1);
  });

  it('LedgerSigner declares correct capabilities and blind-signing defaults', async () => {
    const ledgerAddress = 'GAXU4F...MOCK';
    const signer = new LedgerSigner(ledgerAddress, "m/44'/148'/0'");

    expect(signer.type).toBe('ledger');
    expect(signer.publicKey).toBe(ledgerAddress);
    expect(signer.capabilities.canSignClassic).toBe(true);
    expect(signer.capabilities.canSignSorobanAuth).toBe(false); // Blind signing disabled by default
    expect(signer.capabilities.isHardware).toBe(true);
    expect(signer.capabilities.requiresUserPresence).toBe(true);
    expect(signer.capabilities.showsReadableDetailsOnDevice).toBe(true);

    const verified = await signer.verifyAddressOnDevice?.();
    expect(verified).toBe(true);
  });

  it('PasskeySigner declares smart account contract capabilities', async () => {
    const contractAddress = 'CCONTRAC7MOCK...';
    const signer = new PasskeySigner(contractAddress, 'mock-cred-id-123');

    expect(signer.type).toBe('passkey');
    expect(signer.publicKey).toBe(contractAddress);
    expect(signer.capabilities.canSignClassic).toBe(false);
    expect(signer.capabilities.canSignSorobanAuth).toBe(true);
    expect(signer.capabilities.isContractAccount).toBe(true);
    expect(signer.capabilities.requiresUserPresence).toBe(true);
  });

  it('Generic Signer interface abstracts signers consistently', async () => {
    const signers: Signer[] = [
      new LocalKeySigner(testKp),
      new LedgerSigner('GLEDGER...', "m/44'/148'/0'"),
      new PasskeySigner('CPASSKEY...', 'cred-123'),
    ];

    expect(signers.length).toBe(3);
    for (const s of signers) {
      expect(s.publicKey).toBeDefined();
      expect(s.type).toMatch(/local|ledger|passkey/);
      expect(typeof s.capabilities.requiresUserPresence).toBe('boolean');
    }
  });
});
