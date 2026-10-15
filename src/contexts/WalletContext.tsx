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
  updatePreferences: (prefs: Partial<WalletPreferences>) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [keystore, setKeystore] = useState<EncryptedKeystore | null>(null);
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

  // Load keystore & prefs on boot
  useEffect(() => {
    async function init() {
      const stored = await storage.getKeystore();
      const prefs = await storage.getPreferences();
      setPreferencesState(prefs);
      if (stored) {
        setKeystore(stored);
        setIsInitialized(true);
        setIsLocked(true);
      } else {
        setIsInitialized(false);
        setIsLocked(false);
      }
    }
    init();
  }, []);

  // Lock function clears in-memory secrets
  const lock = useCallback(() => {
    setMnemonic(null);
    setAccounts([]);
    cachedPasswordRef.current = null;
    setIsLocked(true);
  }, []);

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

  const resetWallet = async (): Promise<void> => {
    await storage.removeKeystore();
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
