import dotenv from 'dotenv';
import { Keypair } from '@stellar/stellar-sdk';

dotenv.config();

export interface ServerConfig {
  port: number;
  stellarNetwork: 'testnet' | 'public';
  horizonUrl: string;
  sorobanRpcUrl: string;
  networkPassphrase: string;
  relayerKeypair: Keypair;
  dailySponsoredLimit: number;
  dailyIpSponsoredLimit: number;
  dailyGlobalBudgetStroops: number;
  maxDeployPerIp: number;
  maxGlobalDailyDeploys: number;
  maxBaseFeeStroops: number;
  maxResourceFeeStroops: number;
  allowedOperations: string[];
}

const NETWORK = (process.env.STELLAR_NETWORK as 'testnet' | 'public') || 'testnet';
const IS_TESTNET = NETWORK === 'testnet';

// For local testing & testnet, default to a deterministic sponsor keypair if none provided in env
const defaultTestnetSponsorSecret =
  process.env.RELAYER_SECRET_KEY ||
  'SBQOXC75X5WBLJ4T4W3F2QYDFW2T3U35L5Z3ZJ46VMBP27Q6DFY5U4M3';

let relayerKeypair: Keypair;
try {
  relayerKeypair = Keypair.fromSecret(defaultTestnetSponsorSecret);
} catch {
  relayerKeypair = Keypair.random();
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  stellarNetwork: NETWORK,
  horizonUrl: IS_TESTNET
    ? 'https://horizon-testnet.stellar.org'
    : 'https://horizon.stellar.org',
  sorobanRpcUrl: IS_TESTNET
    ? 'https://soroban-testnet.stellar.org'
    : 'https://soroban-rpc.stellar.org',
  networkPassphrase: IS_TESTNET
    ? 'Test SDF Network ; September 2015'
    : 'Public Global Stellar Network ; July 2015',
  relayerKeypair,
  dailySponsoredLimit: 5,
  dailyIpSponsoredLimit: 10, // Max 10 sponsorship requests per IP/day
  dailyGlobalBudgetStroops: 100_000_000, // 10 XLM per day total pool cap
  maxDeployPerIp: 2, // Max 2 smart account deploys per IP/day to prevent relayer draining
  maxGlobalDailyDeploys: 10, // Max 10 deployments across all users per day
  maxBaseFeeStroops: 5_000, // 0.0005 XLM base fee hard cap
  maxResourceFeeStroops: 100_000, // 0.01 XLM Soroban resource fee hard cap
  allowedOperations: [
    'payment',
    'changeTrust',
    'manageBuyOffer',
    'manageSellOffer',
    'createPassiveSellOffer',
    'pathPaymentStrictReceive',
    'pathPaymentStrictSend',
    'invokeHostFunction',
  ],
};
