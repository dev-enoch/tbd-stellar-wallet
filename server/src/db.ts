export interface SponsoredUsageRecord {
  contractAddress: string;
  date: string; // YYYY-MM-DD
  count: number;
  totalFeeStroops: number;
  lastSponsoredAt: number;
}

export interface SmartAccountRecord {
  contractAddress: string;
  primaryCredentialId: string;
  recoveryCredentialIds: string[];
  ownerPublicKey: string;
  createdAt: number;
  deployed: boolean;
  rentFunded: boolean;
  nickname: string;
}

export interface AnchorDirectoryRecord {
  id: string;
  name: string;
  domain: string;
  regulatoryStatus: string;
  isPilotApproved: boolean;
  transferServerSep0024?: string;
  webAuthEndpoint?: string;
  currencies: string[];
  lastResolvedAt?: number;
}

class RelayerDatabase {
  private usage: Map<string, SponsoredUsageRecord> = new Map();
  private dailyBudget: Map<string, number> = new Map(); // date -> stroops used
  private accounts: Map<string, SmartAccountRecord> = new Map();
  private anchors: Map<string, AnchorDirectoryRecord> = new Map();

  constructor() {
    this.seedAnchors();
  }

  private seedAnchors() {
    // Official Stellar testnet anchor sandbox and verified pilot candidates
    this.registerAnchor({
      id: 'testanchor',
      name: 'Stellar Testnet Anchor (SEP-24 Sandbox)',
      domain: 'testanchor.stellar.org',
      regulatoryStatus: 'SDF Official Testnet Anchor Sandbox',
      isPilotApproved: true,
      currencies: ['USDC', 'SRT', 'NGN'],
    });

    this.registerAnchor({
      id: 'cowrywise',
      name: 'Cowrywise (Evaluation Partner)',
      domain: 'stellar.cowrywise.com',
      regulatoryStatus: 'Under ARIP Evaluation / Draft MoU (Pilot Mode)',
      isPilotApproved: false, // Gated until legal opinion & signed agreement
      currencies: ['NGN', 'USDC'],
    });

    this.registerAnchor({
      id: 'yellowcard',
      name: 'Yellow Card (B2B Rails)',
      domain: 'stellar.yellowcard.io',
      regulatoryStatus: 'B2B Liquidity Rails Only (Retail Closed Early 2026)',
      isPilotApproved: false, // Retail trading closed
      currencies: ['NGN', 'USDC'],
    });

    this.registerAnchor({
      id: 'linkerfi',
      name: 'Linker Fi (Candidate Anchor)',
      domain: 'linkerfi.com',
      regulatoryStatus: 'Under Evaluation / Pending SEC Regulatory Opinion',
      isPilotApproved: false,
      currencies: ['NGN', 'USDC'],
    });
  }

  // --- Sponsored Usage ---
  getUsage(contractAddress: string, date: string): SponsoredUsageRecord {
    const key = `${date}:${contractAddress}`;
    return (
      this.usage.get(key) || {
        contractAddress,
        date,
        count: 0,
        totalFeeStroops: 0,
        lastSponsoredAt: 0,
      }
    );
  }

  recordUsage(contractAddress: string, date: string, feeStroops: number): SponsoredUsageRecord {
    const key = `${date}:${contractAddress}`;
    const current = this.getUsage(contractAddress, date);
    const updated: SponsoredUsageRecord = {
      ...current,
      count: current.count + 1,
      totalFeeStroops: current.totalFeeStroops + feeStroops,
      lastSponsoredAt: Date.now(),
    };
    this.usage.set(key, updated);

    // Update global budget
    const currentBudget = this.dailyBudget.get(date) || 0;
    this.dailyBudget.set(date, currentBudget + feeStroops);

    return updated;
  }

  getGlobalDailyBudgetUsed(date: string): number {
    return this.dailyBudget.get(date) || 0;
  }

  // --- Smart Accounts Registry ---
  registerSmartAccount(account: SmartAccountRecord): void {
    this.accounts.set(account.contractAddress, account);
  }

  getSmartAccount(contractAddress: string): SmartAccountRecord | undefined {
    return this.accounts.get(contractAddress);
  }

  addRecoveryPasskey(contractAddress: string, recoveryCredentialId: string): boolean {
    const acc = this.accounts.get(contractAddress);
    if (!acc) return false;
    if (!acc.recoveryCredentialIds.includes(recoveryCredentialId)) {
      acc.recoveryCredentialIds.push(recoveryCredentialId);
    }
    return true;
  }

  // --- Anchors Directory ---
  registerAnchor(anchor: AnchorDirectoryRecord): void {
    this.anchors.set(anchor.id, anchor);
  }

  getAnchor(id: string): AnchorDirectoryRecord | undefined {
    return this.anchors.get(id);
  }

  listAnchors(): AnchorDirectoryRecord[] {
    return Array.from(this.anchors.values());
  }

  updateAnchor(id: string, updates: Partial<AnchorDirectoryRecord>): void {
    const existing = this.anchors.get(id);
    if (existing) {
      this.anchors.set(id, { ...existing, ...updates });
    }
  }

  clearAll(): void {
    this.usage.clear();
    this.dailyBudget.clear();
    this.accounts.clear();
    this.seedAnchors();
  }
}

export const db = new RelayerDatabase();
