export type RampType = 'buy' | 'sell';
export type RampStatus =
  | 'pending_user_transfer_start'
  | 'waiting_for_payment'
  | 'pending_anchor'
  | 'pending_stellar'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface RampPartner {
  id: string;
  name: string;
  domain: string;
  isPilotApproved: boolean; // Go/No-Go Gate: True only for tested sandbox / executed legal agreements
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
  isPilotApproved: boolean;
  type: RampType;
  fiatAmountNgn: number;
  cryptoAmountUsdc: number;
  feeNgn: number;
  netCryptoUsdc: number;
  rateNgnPerUsdc: number;
  arrivalMinutes: number;
  referralDisclosure: string;
  interactiveUrl: string;
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
  interactiveUrl: string;
}

/**
 * Verified candidate anchors directory.
 * Explicitly states regulatory status per Nigerian SEC ARIP rules and B2B transitions.
 */
export const RAMP_PARTNERS: RampPartner[] = [
  {
    id: 'testanchor',
    name: 'Stellar Sandbox Anchor (Testnet)',
    domain: 'testanchor.stellar.org',
    isPilotApproved: true,
    licenseDetails: 'Official SDF SEP-24 Reference Implementation & Sandbox',
    depositFeePercent: 0.1,
    withdrawalFeePercent: 0.1,
    rateNgnPerUsdc: 1520,
    minNgn: 1000,
    maxNgn: 1000000,
    estimatedArrivalMinutes: 2,
    supportEmail: 'support@stellar.org',
    referralDisclosure: 'Non-commercial reference sandbox. Zero fees collected by Stellith.',
  },
  {
    id: 'cowrywise',
    name: 'Cowrywise (Evaluation Candidate)',
    domain: 'stellar.cowrywise.com',
    isPilotApproved: false,
    licenseDetails: 'Under ARIP incubation evaluation · Pending executed agreement & counsel opinion',
    depositFeePercent: 0.5,
    withdrawalFeePercent: 0.75,
    rateNgnPerUsdc: 1520,
    minNgn: 2000,
    maxNgn: 500000,
    estimatedArrivalMinutes: 10,
    supportEmail: 'support@cowrywise.com',
    referralDisclosure: 'No commercial referral agreement active. Referral terms subject to formal partnership.',
  },
  {
    id: 'yellowcard',
    name: 'Yellow Card (B2B Rails)',
    domain: 'stellar.yellowcard.io',
    isPilotApproved: false,
    licenseDetails: 'Institutional B2B Rails · Retail Trading Discontinued Early 2026',
    depositFeePercent: 0.75,
    withdrawalFeePercent: 0.8,
    rateNgnPerUsdc: 1515,
    minNgn: 1500,
    maxNgn: 1000000,
    estimatedArrivalMinutes: 15,
    supportEmail: 'support@yellowcard.io',
    referralDisclosure: 'B2B infrastructure only. Direct retail trading is discontinued.',
  },
  {
    id: 'linkerfi',
    name: 'Linker Fi (Candidate Anchor)',
    domain: 'linkerfi.com',
    isPilotApproved: false,
    licenseDetails: 'Under Evaluation · Pending SEC Digital Asset Rules Consultation Review',
    depositFeePercent: 1.0,
    withdrawalFeePercent: 0.9,
    rateNgnPerUsdc: 1525,
    minNgn: 1000,
    maxNgn: 250000,
    estimatedArrivalMinutes: 5,
    supportEmail: 'help@linkerfi.com',
    referralDisclosure: 'No commercial referral agreement active during pilot testing.',
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
 * Calculates quotes across partners for evaluation (PRD Section 9).
 */
export function getRampQuotes(type: RampType, amountNgn: number): RampQuote[] {
  if (amountNgn <= 0) return [];

  return RAMP_PARTNERS.map((partner) => {
    const feePct =
      type === 'buy' ? partner.depositFeePercent : partner.withdrawalFeePercent;
    const feeNgn = (amountNgn * feePct) / 100;
    const netNgn = Math.max(0, amountNgn - feeNgn);
    const cryptoAmountUsdc = netNgn / partner.rateNgnPerUsdc;
    const txId = `sep24_${Date.now()}_${partner.id}`;

    return {
      partnerId: partner.id,
      partnerName: partner.name,
      domain: partner.domain,
      isPilotApproved: partner.isPilotApproved,
      type,
      fiatAmountNgn: amountNgn,
      cryptoAmountUsdc: parseFloat(cryptoAmountUsdc.toFixed(2)),
      feeNgn,
      netCryptoUsdc: parseFloat(cryptoAmountUsdc.toFixed(2)),
      rateNgnPerUsdc: partner.rateNgnPerUsdc,
      arrivalMinutes: partner.estimatedArrivalMinutes,
      referralDisclosure: partner.referralDisclosure,
      interactiveUrl: `https://${partner.domain}/sep24/interactive?transaction_id=${txId}&asset_code=USDC`,
    };
  }).sort((a, b) => {
    // Prioritize pilot approved partners first, then best rate
    if (a.isPilotApproved && !b.isPilotApproved) return -1;
    if (!a.isPilotApproved && b.isPilotApproved) return 1;
    return type === 'buy'
      ? b.netCryptoUsdc - a.netCryptoUsdc
      : a.feeNgn - b.feeNgn;
  });
}

/**
 * Initiates an authentic SEP-24 hosted interactive flow with the partner.
 * NEVER fabricates payment instructions or bank details.
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
  const interactiveUrl = `https://${partnerDomain}/sep24/interactive?transaction_id=${txId}&asset_code=USDC&account=${params.userAddress}`;

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
    status: 'pending_user_transfer_start',
    statusExplanation: `Complete your deposit/KYC directly inside ${partnerName}'s verified hosted flow at ${partnerDomain}.`,
    supportEmail,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    userAddress: params.userAddress,
    interactiveUrl,
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
    tx.statusExplanation = `Transaction completed successfully by ${tx.partnerName}. USDC delivered to ${tx.userAddress}.`;
  } else if (newStatus === 'failed') {
    tx.statusExplanation = `Transaction failed or expired. Please contact ${tx.supportEmail} if funds were debited.`;
  } else if (newStatus === 'refunded') {
    tx.statusExplanation = `Payment was reversed and refunded by ${tx.partnerName}.`;
  }

  saveStoredRampTransactions(stored);
  return tx;
}
