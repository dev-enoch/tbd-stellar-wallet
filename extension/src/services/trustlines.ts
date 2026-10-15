import {
  TransactionBuilder,
  Operation,
  Asset,
  Keypair,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { getHorizonServer, NETWORKS, NetworkType } from './stellar';
import { Signer } from './signer';

export interface CuratedAsset {
  code: string;
  issuer: string;
  name: string;
  domain: string;
  verified: boolean;
  decimals: number;
}

export const VERIFIED_ASSETS: Record<NetworkType, CuratedAsset[]> = {
  mainnet: [
    {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      name: 'USD Coin (Centre / Circle)',
      domain: 'circle.com',
      verified: true,
      decimals: 7,
    },
    {
      code: 'EURC',
      issuer: 'GDHU6WRG4IEQXM5NZ4BMPKO5DBFNOCC7BE2HA73UDWNCBNW2PUAP4N6K',
      name: 'Euro Coin (Circle)',
      domain: 'circle.com',
      verified: true,
      decimals: 7,
    },
    {
      code: 'AQUA',
      issuer: 'GBNZILSTVQZ4RAGMVOOKRW2PFGTVMAHQ5NVHCICIYCNMRPHAEIXK57YT',
      name: 'Aquarius Token',
      domain: 'aqua.network',
      verified: true,
      decimals: 7,
    },
    {
      code: 'yXLM',
      issuer: 'GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXMMEDMQGAR',
      name: 'Yield-generating XLM (Ultra Capital)',
      domain: 'ultracapital.xyz',
      verified: true,
      decimals: 7,
    },
  ],
  testnet: [
    {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      name: 'USD Coin (Testnet Anchor)',
      domain: 'centre.io',
      verified: true,
      decimals: 7,
    },
    {
      code: 'EURC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      name: 'Euro Coin (Testnet Anchor)',
      domain: 'circle.com',
      verified: true,
      decimals: 7,
    },
    {
      code: 'AQUA',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      name: 'Aquarius Testnet',
      domain: 'aqua.network',
      verified: true,
      decimals: 7,
    },
  ],
};

/**
 * Searches for assets by code, name, or issuer.
 */
export function searchCuratedAssets(query: string, network: NetworkType = 'testnet'): CuratedAsset[] {
  const assets = VERIFIED_ASSETS[network] || [];
  if (!query.trim()) return assets;

  const q = query.trim().toLowerCase();
  return assets.filter(
    (a) =>
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.issuer.toLowerCase().includes(q) ||
      a.domain.toLowerCase().includes(q)
  );
}

/**
 * Executes a change_trust operation to opt-in or opt-out of an asset trustline.
 */
export async function submitChangeTrust(
  keypair: Keypair,
  assetCode: string,
  assetIssuer: string,
  remove: boolean,
  network: NetworkType = 'testnet',
  signer?: Signer
): Promise<{ hash: string; reserveDelta: number }> {
  const server = getHorizonServer(network);
  const networkConfig = NETWORKS[network];

  // 1. Load source account
  const sourceAccount = await server.loadAccount(keypair.publicKey());

  // 2. Validate removal condition (balance must be 0)
  if (remove) {
    const existing = sourceAccount.balances.find(
      (b: any) => b.asset_code === assetCode && b.asset_issuer === assetIssuer
    );
    if (existing && parseFloat(existing.balance) > 0) {
      throw new Error(`Cannot remove asset trustline while holding a non-zero balance (${existing.balance} ${assetCode}). Transfer or swap it first.`);
    }
  }

  // 3. Build Change Trust operation
  const asset = new Asset(assetCode, assetIssuer);
  const txBuilder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: networkConfig.networkPassphrase,
  });

  // If removing, set limit to '0'. If adding, omit limit for maximum allowed.
  txBuilder.addOperation(
    Operation.changeTrust({
      asset,
      limit: remove ? '0' : undefined,
    })
  );

  txBuilder.setTimeout(30);

  const transaction = txBuilder.build();
  if (signer) {
    const signedXdr = await signer.signTransaction(transaction.toXDR(), networkConfig.networkPassphrase);
    const signedTx = TransactionBuilder.fromXDR(signedXdr, networkConfig.networkPassphrase);
    const response = await server.submitTransaction(signedTx);
    return {
      hash: response.hash,
      reserveDelta: remove ? -0.5 : 0.5,
    };
  }

  transaction.sign(keypair);

  const response = await server.submitTransaction(transaction);
  return {
    hash: response.hash,
    reserveDelta: remove ? -0.5 : 0.5,
  };
}
