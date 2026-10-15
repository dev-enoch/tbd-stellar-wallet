import { Horizon, Networks, StrKey } from '@stellar/stellar-sdk';

export type NetworkType = 'testnet' | 'mainnet';

export interface NetworkConfig {
  type: NetworkType;
  name: string;
  horizonUrls: string[];
  networkPassphrase: string;
  friendbotUrl?: string;
  explorerUrl: string;
}

export const NETWORKS: Record<NetworkType, NetworkConfig> = {
  testnet: {
    type: 'testnet',
    name: 'Stellar Testnet',
    horizonUrls: [
      'https://horizon-testnet.stellar.org',
      'https://testnet.stellar.org',
    ],
    networkPassphrase: Networks.TESTNET,
    friendbotUrl: 'https://friendbot.stellar.org',
    explorerUrl: 'https://stellar.expert/explorer/testnet',
  },
  mainnet: {
    type: 'mainnet',
    name: 'Stellar Mainnet',
    horizonUrls: [
      'https://horizon.stellar.org',
    ],
    networkPassphrase: Networks.PUBLIC,
    explorerUrl: 'https://stellar.expert/explorer/public',
  },
};

export interface AssetBalance {
  code: string;
  issuer?: string;
  balance: string;
  isNative: boolean;
  limit?: string;
  buyingLiabilities?: string;
  sellingLiabilities?: string;
  fiatPrice?: number;
  fiatValue?: number;
}

export interface AccountBalanceSummary {
  exists: boolean;
  totalXlm: string;
  reservedXlm: string;
  spendableXlm: string;
  subentryCount: number;
  baseReserve: number; // 0.5
  reserveExplanation: string;
  assets: AssetBalance[];
}

/**
 * Gets a working Horizon Server instance with fallback.
 */
export function getHorizonServer(network: NetworkType = 'testnet', fallbackIndex = 0): Horizon.Server {
  const config = NETWORKS[network];
  const url = config.horizonUrls[fallbackIndex] || config.horizonUrls[0];
  return new Horizon.Server(url, { allowHttp: false });
}

/**
 * Fetches account details from Horizon with graceful fallback and reserve calculation.
 */
export async function getAccountBalances(
  publicKey: string,
  network: NetworkType = 'testnet'
): Promise<AccountBalanceSummary> {
  const config = NETWORKS[network];
  let accountResponse: Horizon.AccountResponse | null = null;

  for (let i = 0; i < config.horizonUrls.length; i++) {
    try {
      const server = getHorizonServer(network, i);
      accountResponse = await server.loadAccount(publicKey);
      break;
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        // Unfunded account on Stellar
        return {
          exists: false,
          totalXlm: '0.00',
          reservedXlm: '0.00',
          spendableXlm: '0.00',
          subentryCount: 0,
          baseReserve: 0.5,
          reserveExplanation: 'Account is not yet funded on the Stellar network.',
          assets: [
            {
              code: 'XLM',
              balance: '0.00',
              isNative: true,
            },
          ],
        };
      }
      // If error is not 404 and there are more URLs, try next fallback
      if (i === config.horizonUrls.length - 1) {
        throw new Error(`Failed to contact Stellar Horizon: ${err.message || 'Network error'}`);
      }
    }
  }

  if (!accountResponse) {
    throw new Error('Could not load account details');
  }

  const baseReserve = 0.5; // Base reserve in Stellar = 0.5 XLM
  const subentryCount = accountResponse.subentry_count || 0;
  
  // Minimum balance = (2 + subentry_count) * baseReserve
  // Native XLM line
  let nativeBalance = '0';
  let sellingLiabilities = '0';
  const assets: AssetBalance[] = [];

  for (const b of accountResponse.balances) {
    if (b.asset_type === 'native') {
      nativeBalance = b.balance;
      sellingLiabilities = b.selling_liabilities || '0';
      assets.unshift({
        code: 'XLM',
        balance: b.balance,
        isNative: true,
        buyingLiabilities: b.buying_liabilities,
        sellingLiabilities: b.selling_liabilities,
      });
    } else {
      assets.push({
        code: (b as any).asset_code,
        issuer: (b as any).asset_issuer,
        balance: b.balance,
        isNative: false,
        limit: (b as any).limit,
        buyingLiabilities: (b as any).buying_liabilities,
        sellingLiabilities: (b as any).selling_liabilities,
      });
    }
  }

  // Calculate reserves
  const minRequiredXlm = (2 + subentryCount) * baseReserve + parseFloat(sellingLiabilities);
  const totalXlmFloat = parseFloat(nativeBalance);
  const spendableFloat = Math.max(0, totalXlmFloat - minRequiredXlm);

  // Plain-language reserve explanation as required by PRD
  const reserveExplanation = subentryCount === 0
    ? `1.0 XLM is reserved by the network to keep this account active.`
    : `${minRequiredXlm.toFixed(1)} XLM is reserved by the network for this account and ${subentryCount} ${subentryCount === 1 ? 'asset trustline' : 'asset trustlines'}.`;

  return {
    exists: true,
    totalXlm: totalXlmFloat.toFixed(4),
    reservedXlm: minRequiredXlm.toFixed(4),
    spendableXlm: spendableFloat.toFixed(4),
    subentryCount,
    baseReserve,
    reserveExplanation,
    assets,
  };
}

/**
 * Funds an account on Testnet using Friendbot.
 */
export async function fundWithFriendbot(publicKey: string): Promise<boolean> {
  const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Friendbot funding failed: ${errorText}`);
  }
  return true;
}

/**
 * Shortens Stellar public keys: "GB4K...8XZ9"
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2) return address;
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
}

/**
 * Generates explorer URL for an account or transaction
 */
export function getExplorerUrl(
  type: 'account' | 'tx',
  value: string,
  network: NetworkType = 'testnet'
): string {
  const base = NETWORKS[network].explorerUrl;
  return `${base}/${type}/${value}`;
}

/**
 * Validates a Stellar address (supports both standard G... and muxed M... addresses)
 */
export function isValidAddress(address: string): boolean {
  const clean = address.trim();
  return StrKey.isValidEd25519PublicKey(clean) || StrKey.isValidMed25519PublicKey(clean);
}
