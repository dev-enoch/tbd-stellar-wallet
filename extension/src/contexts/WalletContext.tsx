import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  EncryptedKeystore,
  DecryptedVault,
  DerivedAccount,
  deriveStellarKeypair,
  encryptVault,
  decryptVault,
  fromSecretKey,
} from '../services/crypto';
import { storage, WalletPreferences } from '../services/storage';

interface WalletContextType {
  isReady: boolean;
  isInitialized: boolean;
  isLocked: boolean;
  accounts: DerivedAccount[];
  activeAccount: DerivedAccount | null;
  activeAccountIndex: number;
  preferences: WalletPreferences;
  createWallet: (phrase: string, password: string) => Promise<void>;
  importWallet: (phrase: string, password: string) => Promise<void>;
  importSecretKey: (secretKey: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  resetWallet: () => Promise<void>;
  addAccount: (name?: string) => Promise<DerivedAccount>;
  switchAccount: (index: number) => void;
  revealPhrase: (password: string) => Promise<string>;
  revealPrivateKey: (password: string) => Promise<string>;
  updatePreferences: (prefs: Partial<WalletPreferences>) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [keystore, setKeystore] = useState<EncryptedKeystore | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(true);

  // In-memory decrypted vault
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<DerivedAccount[]>([]);
  const [activeAccountIndex, setActiveAccountIndex] = useState<number>(0);
  const [preferences, setPreferencesState] = useState<WalletPreferences>({
    network: 'testnet',
    currency: 'USD',
    autoLockMinutes: 15,
    connectedSites: [],
  });

  const lastActivityRef = useRef<number>(Date.now());
  const cachedPasswordRef = useRef<string | null>(null);

  // Lock function clears in-memory secrets and clears session auth
  const lock = useCallback(() => {
    setMnemonic(null);
    setAccounts([]);
    cachedPasswordRef.current = null;
    setIsLocked(true);
    storage.clearSessionAuth().catch(() => {});
  }, []);

  // Load keystore & prefs on boot with session auto-restore
  useEffect(() => {
    async function init() {
      try {
        const stored = await storage.getKeystore();
        const prefs = await storage.getPreferences();
        setPreferencesState(prefs);

        if (stored) {
          setKeystore(stored);
          setIsInitialized(true);

          // Check if session auth is valid and not expired
          const session = await storage.getSessionAuth();
          if (session && session.password) {
            const elapsedMinutes = (Date.now() - session.lastActive) / (1000 * 60);
            if (prefs.autoLockMinutes === 0 || elapsedMinutes < prefs.autoLockMinutes) {
              try {
                const vault = await decryptVault(stored, session.password);
                const derivedAccounts: DerivedAccount[] = [];
                if (vault.mnemonic.startsWith('imported:')) {
                  const secret = vault.mnemonic.replace('imported:', '');
                  const kp = fromSecretKey(secret);
                  derivedAccounts.push({
                    index: 0,
                    name: vault.accounts[0]?.name || 'Imported Account',
                    publicKey: kp.publicKey(),
                    secretKey: kp.secret(),
                    keypair: kp,
                  });
                } else {
                  for (const acc of vault.accounts) {
                    const derived = await deriveStellarKeypair(vault.mnemonic, acc.index);
                    derivedAccounts.push({
                      ...derived,
                      name: acc.name,
                    });
                  }
                }

                setMnemonic(vault.mnemonic);
                setAccounts(derivedAccounts);
                setActiveAccountIndex(vault.activeAccountIndex || 0);
                cachedPasswordRef.current = session.password;
                lastActivityRef.current = Date.now();
                await storage.updateSessionActivity();
                setIsLocked(false);
              } catch {
                await storage.clearSessionAuth();
                setIsLocked(true);
              }
            } else {
              // Session expired
              await storage.clearSessionAuth();
              setIsLocked(true);
            }
          } else {
            setIsLocked(true);
          }
        } else {
          setIsInitialized(false);
          setIsLocked(false);
        }
      } finally {
        setIsReady(true);
      }
    }
    init();
  }, []);

  // Sync active account public key for dApp detection
  useEffect(() => {
    const active = accounts[activeAccountIndex];
    if (active?.publicKey) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ tbd_active_pubkey: active.publicKey });
      }
      localStorage.setItem('tbd_active_pubkey', active.publicKey);
    }
  }, [accounts, activeAccountIndex]);

  // Auto-lock timer
  useEffect(() => {
    if (isLocked || !isInitialized || preferences.autoLockMinutes === 0) return;

    const interval = setInterval(() => {
      const elapsedMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);
      if (elapsedMinutes >= preferences.autoLockMinutes) {
        lock();
      }
    }, 10000); // Check every 10s

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
      storage.updateSessionActivity().catch(() => {});
    };

    window.addEventListener('mousemove', recordActivity);
    window.addEventListener('keydown', recordActivity);
    window.addEventListener('click', recordActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('click', recordActivity);
    };
  }, [isLocked, isInitialized, preferences.autoLockMinutes, lock]);

  const createWallet = async (phrase: string, password: string): Promise<void> => {
    const primaryAccount = await deriveStellarKeypair(phrase, 0);
    const vault: DecryptedVault = {
      mnemonic: phrase,
      accounts: [
        {
          index: 0,
          name: 'Main Account',
          publicKey: primaryAccount.publicKey,
        },
      ],
      activeAccountIndex: 0,
    };

    const encrypted = await encryptVault(vault, password);
    await storage.setKeystore(encrypted);

    setKeystore(encrypted);
    setMnemonic(phrase);
    setAccounts([primaryAccount]);
    setActiveAccountIndex(0);
    setIsInitialized(true);
    setIsLocked(false);
    cachedPasswordRef.current = password;
    await storage.setSessionAuth({ password, lastActive: Date.now() });
  };

  const importWallet = async (phrase: string, password: string): Promise<void> => {
    return createWallet(phrase, password);
  };

  const importSecretKey = async (secretKey: string, password: string): Promise<void> => {
    const kp = fromSecretKey(secretKey);
    const account: DerivedAccount = {
      index: 0,
      name: 'Imported Account',
      publicKey: kp.publicKey(),
      secretKey: kp.secret(),
      keypair: kp,
    };

    const vault: DecryptedVault = {
      mnemonic: `imported:${secretKey}`,
      accounts: [
        {
          index: 0,
          name: 'Imported Account',
          publicKey: account.publicKey,
        },
      ],
      activeAccountIndex: 0,
    };

    const encrypted = await encryptVault(vault, password);
    await storage.setKeystore(encrypted);

    setKeystore(encrypted);
    setMnemonic(vault.mnemonic);
    setAccounts([account]);
    setActiveAccountIndex(0);
    setIsInitialized(true);
    setIsLocked(false);
    cachedPasswordRef.current = password;
    await storage.setSessionAuth({ password, lastActive: Date.now() });
  };

  const unlock = async (password: string): Promise<void> => {
    if (!keystore) throw new Error('No keystore found');
    const vault = await decryptVault(keystore, password);

    // Reconstruct accounts
    const derivedAccounts: DerivedAccount[] = [];
    if (vault.mnemonic.startsWith('imported:')) {
      const secret = vault.mnemonic.replace('imported:', '');
      const kp = fromSecretKey(secret);
      derivedAccounts.push({
        index: 0,
        name: vault.accounts[0]?.name || 'Imported Account',
        publicKey: kp.publicKey(),
        secretKey: kp.secret(),
        keypair: kp,
      });
    } else {
      for (const acc of vault.accounts) {
        const derived = await deriveStellarKeypair(vault.mnemonic, acc.index);
        derivedAccounts.push({
          ...derived,
          name: acc.name,
        });
      }
    }

    setMnemonic(vault.mnemonic);
    setAccounts(derivedAccounts);
    setActiveAccountIndex(vault.activeAccountIndex || 0);
    setIsLocked(false);
    cachedPasswordRef.current = password;
    lastActivityRef.current = Date.now();
    await storage.setSessionAuth({ password, lastActive: Date.now() });
  };

  const addAccount = async (name?: string): Promise<DerivedAccount> => {
    if (!mnemonic || mnemonic.startsWith('imported:')) {
      throw new Error('Cannot derive accounts from a single imported secret key');
    }

    const nextIndex = accounts.length;
    const newAccount = await deriveStellarKeypair(mnemonic, nextIndex);
    const accountName = name || `Account ${nextIndex + 1}`;
    newAccount.name = accountName;

    const updatedAccounts = [...accounts, newAccount];
    setAccounts(updatedAccounts);

    // Save updated accounts to keystore if password is known
    if (cachedPasswordRef.current && keystore) {
      const updatedVault: DecryptedVault = {
        mnemonic,
        accounts: updatedAccounts.map((a) => ({
          index: a.index,
          name: a.name,
          publicKey: a.publicKey,
        })),
        activeAccountIndex,
      };
      const newEncrypted = await encryptVault(updatedVault, cachedPasswordRef.current);
      await storage.setKeystore(newEncrypted);
      setKeystore(newEncrypted);
    }

    return newAccount;
  };

  const switchAccount = (index: number) => {
    if (index >= 0 && index < accounts.length) {
      setActiveAccountIndex(index);
    }
  };

  const revealPhrase = async (password: string): Promise<string> => {
    if (!keystore) throw new Error('No keystore found');
    const vault = await decryptVault(keystore, password);
    if (vault.mnemonic.startsWith('imported:')) {
      return vault.mnemonic.replace('imported:', '');
    }
    return vault.mnemonic;
  };

  const revealPrivateKey = async (password: string): Promise<string> => {
    if (!keystore) throw new Error('No keystore found');
    const vault = await decryptVault(keystore, password);
    if (vault.mnemonic.startsWith('imported:')) {
      return vault.mnemonic.replace('imported:', '');
    }
    const keypair = await deriveStellarKeypair(vault.mnemonic, activeAccountIndex);
    return keypair.secretKey;
  };

  const resetWallet = async (): Promise<void> => {
    await storage.removeKeystore();
    await storage.clearSessionAuth().catch(() => {});
    setKeystore(null);
    setMnemonic(null);
    setAccounts([]);
    setIsInitialized(false);
    setIsLocked(false);
    cachedPasswordRef.current = null;
  };

  const updatePreferences = async (newPrefs: Partial<WalletPreferences>) => {
    await storage.setPreferences(newPrefs);
    setPreferencesState((prev) => ({ ...prev, ...newPrefs }));
  };

  const activeAccount = accounts[activeAccountIndex] || null;

  return (
    <WalletContext.Provider
      value={{
        isReady,
        isInitialized,
        isLocked,
        accounts,
        activeAccount,
        activeAccountIndex,
        preferences,
        createWallet,
        importWallet,
        importSecretKey,
        unlock,
        lock,
        resetWallet,
        addAccount,
        switchAccount,
        revealPhrase,
        revealPrivateKey,
        updatePreferences,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
