import { describe, it, expect } from 'vitest';
import {
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Account,
} from '@stellar/stellar-sdk';
import { decodeTransactionXdr } from '../services/dappProvider';
import { NETWORKS } from '../services/stellar';

describe('dApp Provider & Plain-Language XDR Decoder', () => {
  const userPublicKey = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
  const destPublicKey = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

  it('translates payment XDR into plain-language what-leaves and what-arrives summary', () => {
    const dummyAccount = new Account(userPublicKey, '100');
    const tx = new TransactionBuilder(dummyAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORKS.testnet.networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: destPublicKey,
          asset: new Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'),
          amount: '75.50',
        })
      )
      .setTimeout(30)
      .build();

    const xdr = tx.toXDR();
    const preview = decodeTransactionXdr(xdr, userPublicKey, 'testnet');

    expect(preview.headline).toContain('75.50');
    expect(preview.headline).toContain('USDC');
    expect(preview.whatLeaves[0]).toContain('75.50');
    expect(preview.whatLeaves[0]).toContain('USDC');
    expect(preview.hasHighRisk).toBe(false);
    expect(preview.operationsCount).toBe(1);
    expect(preview.operations[0].type).toBe('Payment');
  });

  it('detects high-risk permissions such as signer changes in setOptions', () => {
    const dummyAccount = new Account(userPublicKey, '100');
    const tx = new TransactionBuilder(dummyAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORKS.testnet.networkPassphrase,
    })
      .addOperation(
        Operation.setOptions({
          signer: {
            ed25519PublicKey: destPublicKey,
            weight: 5,
          },
        })
      )
      .setTimeout(30)
      .build();

    const xdr = tx.toXDR();
    const preview = decodeTransactionXdr(xdr, userPublicKey, 'testnet');

    expect(preview.hasHighRisk).toBe(true);
    expect(preview.warnings.length).toBeGreaterThan(0);
    expect(preview.warnings[0]).toContain('security signers');
  });
});
