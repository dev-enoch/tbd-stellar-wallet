export type RampType = 'buy' | 'sell';
export type RampStatus =
  | 'pending'
  | 'waiting_for_payment'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface RampPartner {
  id: string;
  name: string;
  domain: string;
  isLicensed: boolean;
  licenseDetails: string;
  depositFeePercent: number;
  withdrawalFeePercent: number;
  rateNgnPerUsdc: number;
  minNgn: number;
  maxNgn: number;
  estimatedArrivalMinutes: number;
  supportEmail: string;
  referralDisclosure: string;
}

export interface RampQuote {
  partnerId: string;
  partnerName: string;
  domain: string;
  isLicensed: boolean;
  type: RampType;
  fiatAmountNgn: number;
  cryptoAmountUsdc: number;
  feeNgn: number;
  netCryptoUsdc: number;
  rateNgnPerUsdc: number;
  arrivalMinutes: number;
  referralDisclosure: string;
}

export interface RampTransaction {
  id: string;
  partnerId: string;
  partnerName: string;
  domain: string;
  type: RampType;
  fiatAmountNgn: number;
  cryptoAmountUsdc: number;
  rateNgn: number;
  feeNgn: number;
  status: RampStatus;
  statusExplanation: string;
  supportEmail: string;
  createdAt: number;
  updatedAt: number;
  userAddress: string;
  txHash?: string;
  depositInstructions?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    referenceCode: string;
  };
}

export const RAMP_PARTNERS: RampPartner[] = [
  {
    id: 'cowrywise',
    name: 'Cowry Anchor',
    domain: 'stellar.cowrywise.com',
    isLicensed: true,
    licenseDetails: 'SEC Registered Digital Asset Operator & Fund Manager',
    depositFeePercent: 0.5,
    withdrawalFeePercent: 0.75,
    rateNgnPerUsdc: 1520,
    minNgn: 2000,
    maxNgn: 500000,
    estimatedArrivalMinutes: 10,
    supportEmail: 'support@cowrywise.com',
    referralDisclosure: 'Stellith receives a 0.1% software maintenance referral fee from Cowry Anchor with zero markup to you.',
  },
  {
    id: 'yellowcard',
    name: 'Yellow Card Anchor',
    domain: 'stellar.yellowcard.io',
    isLicensed: true,
    licenseDetails: 'Licensed Cross-Border VASP & Licensed Bureau',
    depositFeePercent: 0.75,
    withdrawalFeePercent: 0.8,
    rateNgnPerUsdc: 1515,
    minNgn: 1500,
    maxNgn: 1000000,
    estimatedArrivalMinutes: 15,
    supportEmail: 'support@yellowcard.io',
    referralDisclosure: 'Stellith receives a 0.1% ecosystem referral rebate from Yellow Card.',
  },
  {
    id: 'linker',
    name: 'Linker Fi',
    domain: 'linkerfi.com',
    isLicensed: true,
    licenseDetails: 'SEC ARIP Cohort Licensed Digital Asset Adapter',
    depositFeePercent: 1.0,
    withdrawalFeePercent: 0.9,
    rateNgnPerUsdc: 1525,
    minNgn: 1000,
    maxNgn: 250000,
    estimatedArrivalMinutes: 3,
    supportEmail: 'help@linkerfi.com',
    referralDisclosure: 'Direct open protocol integration with zero referral fee added.',
  },
];

const RAMP_TXS_STORAGE_KEY = 'tbd_ramp_transactions';
let memoryRampTxs: RampTransaction[] = [];

export function getStoredRampTransactions(): RampTransaction[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(RAMP_TXS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return memoryRampTxs;
}

export function saveStoredRampTransactions(txs: RampTransaction[]): void {
  memoryRampTxs = [...txs];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RAMP_TXS_STORAGE_KEY, JSON.stringify(txs));
    }
  } catch {
    // storage full
  }
}

/**
 * Calculates quotes across all supported licensed partners for comparison (PRD Section 9).
 */
export function getRampQuotes(type: RampType, amountNgn: number): RampQuote[] {
  if (amountNgn <= 0) return [];

  return RAMP_PARTNERS.map((partner) => {
    const feePct =
      type === 'buy' ? partner.depositFeePercent : partner.withdrawalFeePercent;
    const feeNgn = (amountNgn * feePct) / 100;
    const netNgn = Math.max(0, amountNgn - feeNgn);
    const cryptoAmountUsdc = netNgn / partner.rateNgnPerUsdc;

    return {
      partnerId: partner.id,
      partnerName: partner.name,
      domain: partner.domain,
      isLicensed: partner.isLicensed,
      type,
      fiatAmountNgn: amountNgn,
      cryptoAmountUsdc: parseFloat(cryptoAmountUsdc.toFixed(2)),
      feeNgn,
      netCryptoUsdc: parseFloat(cryptoAmountUsdc.toFixed(2)),
      rateNgnPerUsdc: partner.rateNgnPerUsdc,
      arrivalMinutes: partner.estimatedArrivalMinutes,
      referralDisclosure: partner.referralDisclosure,
    };
  }).sort((a, b) => {
    // Best quote first: for buy, more USDC is better; for sell, more NGN is better
    return type === 'buy'
      ? b.netCryptoUsdc - a.netCryptoUsdc
      : a.feeNgn - b.feeNgn;
  });
}

/**
 * Initiates an interactive SEP-24 ramp flow with a partner.
 */
export function initiateRampTransaction(params: {
  quote: RampQuote;
  userAddress: string;
}): RampTransaction {
  const partner = RAMP_PARTNERS.find((p) => p.id === params.quote.partnerId);
  const partnerName = partner?.name || 'Anchor Partner';
  const partnerDomain = partner?.domain || 'anchor.stellar.org';
  const supportEmail = partner?.supportEmail || 'support@anchor.org';

  const txId = `ramp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const refCode = `STL-${Math.floor(100000 + Math.random() * 900000)}`;

  const newTx: RampTransaction = {
    id: txId,
    partnerId: params.quote.partnerId,
    partnerName,
    domain: partnerDomain,
    type: params.quote.type,
    fiatAmountNgn: params.quote.fiatAmountNgn,
    cryptoAmountUsdc: params.quote.netCryptoUsdc,
    rateNgn: params.quote.rateNgnPerUsdc,
    feeNgn: params.quote.feeNgn,
    status: 'waiting_for_payment',
    statusExplanation:
      params.quote.type === 'buy'
        ? `Waiting for your bank transfer to ${partnerName}. Use your unique reference code ${refCode}.`
        : `Anchor is processing your USDC withdrawal and preparing bank transfer.`,
    supportEmail,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    userAddress: params.userAddress,
    depositInstructions: {
      bankName: 'Providus Bank / Flutterwave Virtual',
      accountNumber: '9984729103',
      accountName: `${partnerName} Settlement`,
      referenceCode: refCode,
    },
  };

  const stored = getStoredRampTransactions();
  stored.unshift(newTx);
  saveStoredRampTransactions(stored);

  return newTx;
}

/**
 * Updates a ramp transaction's status.
 */
export function updateRampTransactionStatus(
  txId: string,
  newStatus: RampStatus,
  txHash?: string
): RampTransaction | null {
  const stored = getStoredRampTransactions();
  const tx = stored.find((t) => t.id === txId);
  if (!tx) return null;

  tx.status = newStatus;
  tx.updatedAt = Date.now();
  if (txHash) tx.txHash = txHash;

  if (newStatus === 'completed') {
    tx.statusExplanation = `Transaction completed successfully. USDC delivered to ${tx.userAddress}.`;
  } else if (newStatus === 'failed') {
    tx.statusExplanation = `Transaction failed or expired. Please contact ${tx.supportEmail} if funds were debited.`;
  } else if (newStatus === 'refunded') {
    tx.statusExplanation = `Payment was reversed and refunded to your original bank account.`;
  }

  saveStoredRampTransactions(stored);
  return tx;
}
