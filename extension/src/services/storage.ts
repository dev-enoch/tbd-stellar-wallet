import { EncryptedKeystore } from './crypto';

const KEYSTORE_KEY = 'tbd_keystore';
const PREFS_KEY = 'tbd_preferences';

export interface WalletPreferences {
  network: 'testnet' | 'mainnet';
  currency: 'USD' | 'EUR' | 'NGN' | 'GBP';
  autoLockMinutes: number; // 0 = never, 5, 15, 30, 60
  threatScanningEnabled: boolean;
  allowBlindSigning: boolean;
  connectedSites: {
    origin: string;
    connectedAt: number;
    accountPublicKey: string;
  }[];
}

export interface SessionAuth {
  password: string;
  lastActive: number;
}

export interface SendDraft {
  assetCode: string;
  amount: string;
  recipient: string;
  memoType: 'none' | 'text' | 'id' | 'hash';
  memoValue: string;
  stage: 'amount' | 'recipient' | 'confirm';
  updatedAt: number;
}

const defaultPreferences: WalletPreferences = {
  network: 'testnet', // Default to testnet for safe exploration as per PRD
  currency: 'USD',
  autoLockMinutes: 15,
  threatScanningEnabled: true,
  allowBlindSigning: false,
  connectedSites: [],
};

export const storage = {
  async getKeystore(): Promise<EncryptedKeystore | null> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([KEYSTORE_KEY], (res) => {
          resolve((res[KEYSTORE_KEY] as EncryptedKeystore) || null);
        });
      });
    }
    const raw = localStorage.getItem(KEYSTORE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async setKeystore(keystore: EncryptedKeystore): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [KEYSTORE_KEY]: keystore }, () => resolve());
      });
    }
    localStorage.setItem(KEYSTORE_KEY, JSON.stringify(keystore));
  },

  async removeKeystore(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([KEYSTORE_KEY], () => resolve());
      });
    }
    localStorage.removeItem(KEYSTORE_KEY);
  },

  async getPreferences(): Promise<WalletPreferences> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([PREFS_KEY], (res) => {
          resolve(res[PREFS_KEY] ? { ...defaultPreferences, ...(res[PREFS_KEY] as Partial<WalletPreferences>) } : defaultPreferences);
        });
      });
    }
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...defaultPreferences, ...JSON.parse(raw) } : defaultPreferences;
  },

  async setPreferences(prefs: Partial<WalletPreferences>): Promise<void> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [PREFS_KEY]: updated }, () => resolve());
      });
    }
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  },

  async getSessionAuth(): Promise<SessionAuth | null> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
      return new Promise((resolve) => {
        chrome.storage.session.get(['tbd_session_auth'], (res) => {
          resolve((res['tbd_session_auth'] as SessionAuth) || null);
        });
      });
    }
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem('tbd_session_auth');
      return raw ? JSON.parse(raw) : null;
    }
    return null;
  },

  async setSessionAuth(auth: SessionAuth): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
      return new Promise((resolve) => {
        chrome.storage.session.set({ ['tbd_session_auth']: auth }, () => resolve());
      });
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('tbd_session_auth', JSON.stringify(auth));
    }
  },

  async updateSessionActivity(): Promise<void> {
    const current = await this.getSessionAuth();
    if (current) {
      await this.setSessionAuth({ ...current, lastActive: Date.now() });
    }
  },

  async clearSessionAuth(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
      return new Promise((resolve) => {
        chrome.storage.session.remove(['tbd_session_auth'], () => resolve());
      });
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('tbd_session_auth');
    }
  },

  async getSendDraft(): Promise<SendDraft | null> {
    const KEY = 'tbd_send_draft';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([KEY], (res) => {
          resolve((res[KEY] as SendDraft) || null);
        });
      });
    }
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    }
    return null;
  },

  async setSendDraft(draft: SendDraft): Promise<void> {
    const KEY = 'tbd_send_draft';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [KEY]: draft }, () => resolve());
      });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(draft));
    }
  },

  async clearSendDraft(): Promise<void> {
    const KEY = 'tbd_send_draft';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([KEY], () => resolve());
      });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(KEY);
    }
  },

  async getLastActiveView(): Promise<string | null> {
    const KEY = 'tbd_last_active_view';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([KEY], (res) => {
          resolve((res[KEY] as string) || null);
        });
      });
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(KEY);
    }
    return null;
  },

  async setLastActiveView(view: string): Promise<void> {
    const KEY = 'tbd_last_active_view';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [KEY]: view }, () => resolve());
      });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, view);
    }
  },
};
