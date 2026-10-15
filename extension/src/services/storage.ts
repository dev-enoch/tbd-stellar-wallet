import { EncryptedKeystore } from './crypto';

const KEYSTORE_KEY = 'tbd_keystore';
const PREFS_KEY = 'tbd_preferences';

export interface WalletPreferences {
  network: 'testnet' | 'mainnet';
  currency: 'USD' | 'EUR' | 'NGN' | 'GBP';
  autoLockMinutes: number; // 0 = never, 5, 15, 30, 60
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

const defaultPreferences: WalletPreferences = {
  network: 'testnet', // Default to testnet for safe exploration as per PRD
  currency: 'USD',
  autoLockMinutes: 15,
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
};
