import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Globe,
  DollarSign,
  Moon,
  Sun,
  Lock,
  Radio,
  Trash2,
  KeyRound,
  AlertTriangle,
  Copy,
  Check,
  Info,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  FileCode,
} from 'lucide-react';

interface SettingsScreenProps {
  onBack: () => void;
}

type SettingsSubpage =
  | 'main'
  | 'network'
  | 'currency_language'
  | 'autolock'
  | 'security'
  | 'connected'
  | 'about';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const {
    preferences,
    updatePreferences,
    revealPhrase,
    revealPrivateKey,
    resetWallet,
    activeAccount,
  } = useWallet();
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  // Navigation
  const [subpage, setSubpage] = useState<SettingsSubpage>('main');

  // Security / Reveal State
  const [securityPassword, setSecurityPassword] = useState('');
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [isVerifyingSecurity, setIsVerifyingSecurity] = useState(false);
  const [revealedPhraseWords, setRevealedPhraseWords] = useState<string[]>([]);
  const [revealedSecretKey, setRevealedSecretKey] = useState<string>('');
  const [securityTab, setSecurityTab] = useState<'phrase' | 'private_key'>('phrase');
  const [isSecretKeyMasked, setIsSecretKeyMasked] = useState(true);
  const [copiedPhrase, setCopiedPhrase] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Reset Wallet State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleVerifySecurityPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityPassword) return;
    setSecurityError('');
    setIsVerifyingSecurity(true);
    try {
      const phrase = await revealPhrase(securityPassword);
      const secretKey = await revealPrivateKey(securityPassword);
      setRevealedPhraseWords(phrase.trim().split(/\s+/));
      setRevealedSecretKey(secretKey.trim());
      setIsSecurityUnlocked(true);
      setSecurityPassword('');
    } catch {
      setSecurityError(t.incorrectPassword || 'Incorrect password. Please try again.');
    } finally {
      setIsVerifyingSecurity(false);
    }
  };

  const handleCopyPhrase = () => {
    if (revealedPhraseWords.length > 0) {
      navigator.clipboard.writeText(revealedPhraseWords.join(' '));
      setCopiedPhrase(true);
      showToast('Recovery phrase copied to clipboard');
      setTimeout(() => setCopiedPhrase(false), 2000);
    }
  };

  const handleCopyPrivateKey = () => {
    if (revealedSecretKey) {
      navigator.clipboard.writeText(revealedSecretKey);
      setCopiedKey(true);
      showToast('Private key copied to clipboard');
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleRevokeSite = async (origin: string) => {
    const updated = preferences.connectedSites.filter((s) => s.origin !== origin);
    await updatePreferences({ connectedSites: updated });
    showToast(`Disconnected ${origin}`);
  };

  const handleRevokeAllSites = async () => {
    await updatePreferences({ connectedSites: [] });
    showToast('All connected sites disconnected');
  };

  const handleConfirmReset = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESET') return;
    setIsResetting(true);
    try {
      await resetWallet();
    } finally {
      setIsResetting(false);
    }
  };

  const formatShortAddress = (addr?: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // --- SUBPAGE: NETWORK & RPC ---
  const renderNetworkSubpage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div className="apple-section-header">STELLAR NETWORK</div>
        <div className="apple-group">
          <div
            className="apple-row"
            onClick={() => {
              updatePreferences({ network: 'testnet' });
              showToast('Switched to Stellar Testnet');
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="apple-row-title">Testnet</span>
              <span className="apple-row-subtitle">Public test network with free test funds</span>
            </div>
            {preferences.network === 'testnet' && <Check size={18} color="var(--accent)" />}
          </div>

          <div
            className="apple-row"
            onClick={() => {
              updatePreferences({ network: 'mainnet' });
              showToast('Switched to Stellar Mainnet');
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="apple-row-title">Mainnet</span>
              <span className="apple-row-subtitle">Live production Stellar blockchain network</span>
            </div>
            {preferences.network === 'mainnet' && <Check size={18} color="var(--accent)" />}
          </div>
        </div>
      </div>

      <div>
        <div className="apple-section-header">HORIZON RPC NODE</div>
        <div className="apple-group">
          <div className="apple-row" style={{ cursor: 'default' }}>
            <span className="apple-row-title">Endpoint URL</span>
            <span className="apple-row-value font-mono" style={{ fontSize: '11px' }}>
              {preferences.network === 'testnet'
                ? 'horizon-testnet.stellar.org'
                : 'horizon.stellar.org'}
            </span>
          </div>
          <div className="apple-row" style={{ cursor: 'default' }}>
            <span className="apple-row-title">Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
              <span className="apple-row-value" style={{ color: '#22c55e', fontWeight: 600 }}>Operational</span>
            </div>
          </div>
        </div>
        <p className="apple-section-footer">
          Horizon provides real-time REST access to the Stellar distributed ledger.
        </p>
      </div>
    </div>
  );

  // --- SUBPAGE: CURRENCY & LANGUAGE ---
  const renderCurrencyLanguageSubpage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div className="apple-section-header">DISPLAY CURRENCY</div>
        <div className="apple-group">
          {[
            { code: 'USD', name: 'US Dollar', symbol: '$' },
            { code: 'EUR', name: 'Euro', symbol: '€' },
            { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
            { code: 'GBP', name: 'British Pound', symbol: '£' },
          ].map((item) => (
            <div
              key={item.code}
              className="apple-row"
              onClick={() => {
                updatePreferences({ currency: item.code as any });
                showToast(`Currency set to ${item.code}`);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="apple-icon-chip">{item.symbol}</span>
                <span className="apple-row-title">{item.name} ({item.code})</span>
              </div>
              {preferences.currency === item.code && <Check size={18} color="var(--accent)" />}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="apple-section-header">INTERFACE LANGUAGE</div>
        <div className="apple-group">
          {[
            { code: 'en', name: 'English' },
            { code: 'ha', name: 'Hausa' },
          ].map((item) => (
            <div
              key={item.code}
              className="apple-row"
              onClick={() => {
                setLanguage(item.code as any);
                showToast(`Language set to ${item.name}`);
              }}
            >
              <span className="apple-row-title">{item.name}</span>
              {language === item.code && <Check size={18} color="var(--accent)" />}
            </div>
          ))}
        </div>
        <p className="apple-section-footer">
          Localized strings for English and Hausa across wallet interfaces.
        </p>
      </div>
    </div>
  );

  // --- SUBPAGE: AUTO-LOCK TIMEOUT ---
  const renderAutoLockSubpage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div className="apple-section-header">INACTIVITY TIMEOUT</div>
        <div className="apple-group">
          {[
            { minutes: 5, label: '5 Minutes' },
            { minutes: 15, label: '15 Minutes (Default)' },
            { minutes: 30, label: '30 Minutes' },
            { minutes: 60, label: '1 Hour' },
            { minutes: 120, label: '2 Hours' },
          ].map((item) => (
            <div
              key={item.minutes}
              className="apple-row"
              onClick={() => {
                updatePreferences({ autoLockMinutes: item.minutes });
                showToast(`Auto-lock set to ${item.label}`);
              }}
            >
              <span className="apple-row-title">{item.label}</span>
              {preferences.autoLockMinutes === item.minutes && <Check size={18} color="var(--accent)" />}
            </div>
          ))}
        </div>
        <p className="apple-section-footer">
          Your wallet stays unlocked in memory across popup opens and closes until this period of inactivity elapses.
        </p>
      </div>
    </div>
  );

  // --- SUBPAGE: SECURITY & PRIVACY (REVEAL PHRASE & PRIVATE KEY) ---
  const renderSecuritySubpage = () => {
    if (!isSecurityUnlocked) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="apple-group"
            style={{ padding: '24px 18px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div className="apple-icon-chip" style={{ width: '48px', height: '48px', marginBottom: '12px' }}>
              <Shield size={24} color="var(--accent)" />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px 0' }}>Security Authentication</h3>
            <p className="text-muted text-xs" style={{ margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Enter your wallet password to reveal your recovery phrase or export account private keys.
            </p>

            <form onSubmit={handleVerifySecurityPassword} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="input-group" style={{ textAlign: 'left' }}>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter your wallet password"
                  value={securityPassword}
                  onChange={(e) => setSecurityPassword(e.target.value)}
                  disabled={isVerifyingSecurity}
                  autoFocus
                />
              </div>

              {securityError && (
                <div style={{ color: 'var(--danger)', fontSize: '11px', textAlign: 'left' }}>
                  {securityError}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isVerifyingSecurity || !securityPassword.trim()}
                style={{ width: '100%' }}
              >
                {isVerifyingSecurity ? 'Verifying…' : 'Unlock Secrets'}
              </button>
            </form>
          </div>

          <div className="apple-warning-card">
            <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
              <strong>Never share your recovery credentials:</strong> Anyone who obtains your 12-word recovery phrase or private key can permanently steal all your Stellar assets.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Segmented Pill Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '3px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '12px',
              fontWeight: securityTab === 'phrase' ? 600 : 400,
              background: securityTab === 'phrase' ? 'var(--accent)' : 'transparent',
              color: securityTab === 'phrase' ? 'var(--accent-contrast)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setSecurityTab('phrase')}
          >
            Recovery Phrase (12 Words)
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '12px',
              fontWeight: securityTab === 'private_key' ? 600 : 400,
              background: securityTab === 'private_key' ? 'var(--accent)' : 'transparent',
              color: securityTab === 'private_key' ? 'var(--accent-contrast)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setSecurityTab('private_key')}
          >
            Private Key (Secret Key)
          </button>
        </div>

        {securityTab === 'phrase' ? (
          <div>
            <div className="apple-section-header">12-WORD SECRET RECOVERY PHRASE</div>
            <div className="apple-group" style={{ padding: '16px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                {revealedPhraseWords.map((word, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '14px' }}>
                      {idx + 1}.
                    </span>
                    <span className="font-mono" style={{ fontWeight: 600 }}>{word}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyPhrase}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {copiedPhrase ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                <span>{copiedPhrase ? 'Phrase Copied!' : 'Copy 12-Word Phrase'}</span>
              </button>
            </div>
            <p className="apple-section-footer">
              This phrase restores your entire wallet and all derived accounts. Store it in a secure offline location.
            </p>
          </div>
        ) : (
          <div>
            <div className="apple-section-header">
              ACCOUNT PRIVATE KEY — {activeAccount?.name || 'Active Account'}
            </div>
            <div className="apple-group" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="apple-row-subtitle">Stellar Secret Key (S...)</span>
                <button
                  type="button"
                  onClick={() => setIsSecretKeyMasked(!isSecretKeyMasked)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                >
                  {isSecretKeyMasked ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span>{isSecretKeyMasked ? 'Reveal' : 'Mask'}</span>
                </button>
              </div>

              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '10px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                  color: isSecretKeyMasked ? 'var(--text-muted)' : 'var(--text-primary)',
                  marginBottom: '14px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isSecretKeyMasked
                  ? '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'
                  : revealedSecretKey}
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyPrivateKey}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {copiedKey ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                <span>{copiedKey ? 'Private Key Copied!' : 'Copy Private Key'}</span>
              </button>
            </div>
            <p className="apple-section-footer">
              This raw private key controls only this specific account ({formatShortAddress(activeAccount?.publicKey)}). Never import it on untrusted machines.
            </p>
          </div>
        )}

        <div className="apple-warning-card">
          <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
            <strong>Security Tip:</strong> Close this window or lock your wallet immediately after copying your keys. Do not save them in plain text or screenshots.
          </div>
        </div>
      </div>
    );
  };

  // --- SUBPAGE: CONNECTED DAPPS ---
  const renderConnectedSubpage = () => {
    const sites = preferences.connectedSites || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div className="apple-section-header">CONNECTED SITES ({sites.length})</div>
          {sites.length === 0 ? (
            <div className="apple-group" style={{ padding: '24px 16px', textAlign: 'center' }}>
              <Shield size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '13px', fontWeight: 500 }}>No Connected Sites</div>
              <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                When you connect to dApps via the wallet provider, they will appear here.
              </div>
            </div>
          ) : (
            <div className="apple-group">
              {sites.map((site) => (
                <div key={site.origin} className="apple-row" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '210px' }}>
                    <span className="apple-row-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {site.origin}
                    </span>
                    <span className="apple-row-subtitle">
                      Connected: {new Date(site.connectedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeSite(site.origin)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--danger)' }}
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}

          {sites.length > 0 && (
            <button
              type="button"
              onClick={handleRevokeAllSites}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px', color: 'var(--danger)', fontSize: '12px' }}
            >
              Disconnect All Sites
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- SUBPAGE: ABOUT & DIAGNOSTICS ---
  const renderAboutSubpage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
        <img
          src="/Stellith_logo.jpg"
          alt="Stellith Logo"
          style={{
            width: '48px',
            height: '48px',
            objectFit: 'contain',
            borderRadius: '10px',
            marginBottom: '8px',
            filter: theme === 'dark' ? 'invert(1)' : 'none',
          }}
        />
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px 0' }}>Stellith Wallet</h3>
        <span className="text-muted text-xs">Version 1.0.0</span>
      </div>

      <div>
        <div className="apple-section-header">APPLICATION INFORMATION</div>
        <div className="apple-group">
          <div className="apple-row" style={{ cursor: 'default' }}>
            <span className="apple-row-title">Application Name</span>
            <span className="apple-row-value">Stellith Wallet</span>
          </div>
          <div className="apple-row" style={{ cursor: 'default' }}>
            <span className="apple-row-title">Version</span>
            <span className="apple-row-value font-mono">1.0.0</span>
          </div>
          <div className="apple-row" style={{ cursor: 'default' }}>
            <span className="apple-row-title">Network Engine</span>
            <span className="apple-row-value">Stellar Horizon SDK</span>
          </div>
          <div className="apple-row" style={{ cursor: 'default' }}>
            <span className="apple-row-title">Architecture</span>
            <span className="apple-row-value">Non-Custodial BIP-39 / SLIP-0010</span>
          </div>
        </div>
      </div>

      <div>
        <div className="apple-section-header">SECURITY ENCRYPTIONS</div>
        <div className="apple-group">
          <div className="apple-row" style={{ cursor: 'default' }}>
            <span className="apple-row-title">Key Derivation</span>
            <span className="apple-row-value font-mono" style={{ fontSize: '11px' }}>PBKDF2 (100k iters, SHA-256)</span>
          </div>
          <div className="apple-row" style={{ cursor: 'default' }}>
            <span className="apple-row-title">Vault Cipher</span>
            <span className="apple-row-value font-mono" style={{ fontSize: '11px' }}>AES-GCM-256</span>
          </div>
        </div>
        <p className="apple-section-footer">
          Your keys never leave your device. All encryption keys are created and maintained locally.
        </p>
      </div>
    </div>
  );

  // --- MAIN SETTINGS MENU (APPLE STYLE) ---
  const renderMainMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Active Account Profile Card (Apple ID Banner Style) */}
      <div
        className="apple-group"
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'default',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '16px',
            flexShrink: 0,
          }}
        >
          {activeAccount?.name?.charAt(0).toUpperCase() || 'A'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{activeAccount?.name || 'Account 1'}</span>
            <span className="brand-badge" style={{ fontSize: '9px', padding: '1px 5px' }}>
              {preferences.network.toUpperCase()}
            </span>
          </div>
          <div className="font-mono text-muted text-xs" style={{ marginTop: '2px' }}>
            {formatShortAddress(activeAccount?.publicKey)}
          </div>
        </div>
      </div>

      {/* Group: GENERAL */}
      <div>
        <div className="apple-section-header">GENERAL</div>
        <div className="apple-group">
          <div className="apple-row" onClick={() => setSubpage('network')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="apple-icon-chip"><Radio size={14} /></span>
              <span className="apple-row-title">Stellar Network</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="apple-row-value">{preferences.network === 'testnet' ? 'Testnet' : 'Mainnet'}</span>
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          </div>

          <div className="apple-row" onClick={() => setSubpage('currency_language')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="apple-icon-chip"><DollarSign size={14} /></span>
              <span className="apple-row-title">Currency & Language</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="apple-row-value">{preferences.currency} · {language === 'en' ? 'EN' : 'HA'}</span>
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          </div>

          <div className="apple-row" onClick={toggleTheme}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="apple-icon-chip">
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              </span>
              <span className="apple-row-title">Appearance</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="apple-row-value">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
          </div>

          <div className="apple-row" onClick={() => setSubpage('autolock')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="apple-icon-chip"><Lock size={14} /></span>
              <span className="apple-row-title">Auto-Lock Timer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="apple-row-value">{preferences.autoLockMinutes}m</span>
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>

      {/* Group: SECURITY & PRIVACY */}
      <div>
        <div className="apple-section-header">SECURITY & PRIVACY</div>
        <div className="apple-group">
          <div className="apple-row" onClick={() => setSubpage('security')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="apple-icon-chip"><KeyRound size={14} /></span>
              <span className="apple-row-title">Recovery Phrase & Private Key</span>
            </div>
            <ChevronRight size={14} color="var(--text-muted)" />
          </div>

          <div className="apple-row" onClick={() => setSubpage('connected')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="apple-icon-chip"><Globe size={14} /></span>
              <span className="apple-row-title">Connected dApps</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="apple-row-value">{preferences.connectedSites?.length || 0}</span>
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          </div>

          {/* Malicious Transaction Threat Scanning Switch (PRD Section 4) */}
          <div
            className="apple-row"
            onClick={() => {
              const nextVal = !preferences.threatScanningEnabled;
              updatePreferences({ threatScanningEnabled: nextVal });
              showToast(nextVal ? 'Threat shield activated' : 'Threat shield disabled');
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="apple-icon-chip"><ShieldAlert size={14} /></span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="apple-row-title">Threat Shield</span>
                <span className="apple-row-subtitle">Screen transactions for malicious contracts</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className="apple-row-value"
                style={{
                  fontWeight: 600,
                  color: preferences.threatScanningEnabled ? 'var(--success)' : 'var(--text-muted)',
                }}
              >
                {preferences.threatScanningEnabled ? 'Active' : 'Off'}
              </span>
            </div>
          </div>

          {/* Contract Blind Signing Toggle (PRD Section 5.5) */}
          <div
            className="apple-row"
            onClick={() => {
              const nextVal = !preferences.allowBlindSigning;
              updatePreferences({ allowBlindSigning: nextVal });
              showToast(nextVal ? 'Blind signing allowed (Caution)' : 'Blind signing restricted');
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="apple-icon-chip"><FileCode size={14} /></span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="apple-row-title">Contract Blind Signing</span>
                <span className="apple-row-subtitle">Allow unverified hardware contract calls</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className="apple-row-value"
                style={{
                  fontWeight: 600,
                  color: preferences.allowBlindSigning ? '#eab308' : 'var(--text-muted)',
                }}
              >
                {preferences.allowBlindSigning ? 'Allowed' : 'Off'}
              </span>
            </div>
          </div>
        </div>
        <p className="apple-section-footer">
          Threat shield analyzes transaction parameters against decentralized threat lists. Your secret recovery phrase and private keys never leave this device.
        </p>
      </div>

      {/* Group: SYSTEM & ABOUT */}
      <div>
        <div className="apple-section-header">SYSTEM</div>
        <div className="apple-group">
          <div className="apple-row" onClick={() => setSubpage('about')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="apple-icon-chip"><Info size={14} /></span>
              <span className="apple-row-title">About Stellith Wallet</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="apple-row-value">v1.0.0</span>
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>

      {/* Group: DANGER ZONE */}
      <div>
        <div className="apple-section-header" style={{ color: 'var(--danger)' }}>DANGER ZONE</div>
        <div className="apple-group">
          <div
            className="apple-row"
            onClick={() => {
              setResetConfirmInput('');
              setIsResetModalOpen(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="apple-icon-chip" style={{ color: 'var(--danger)' }}>
                <Trash2 size={14} />
              </span>
              <span className="apple-row-title" style={{ color: 'var(--danger)' }}>
                Reset & Wipe Wallet
              </span>
            </div>
            <ChevronRight size={14} color="var(--danger)" />
          </div>
        </div>
        <p className="apple-section-footer">
          Permanently removes the encrypted keystore from this browser. Ensure your recovery phrase is safely backed up.
        </p>
      </div>
    </div>
  );

  const getSubpageTitle = () => {
    switch (subpage) {
      case 'network':
        return 'Stellar Network';
      case 'currency_language':
        return 'Currency & Language';
      case 'autolock':
        return 'Auto-Lock';
      case 'security':
        return 'Security & Keys';
      case 'connected':
        return 'Connected dApps';
      case 'about':
        return 'About Stellith';
      default:
        return 'Settings';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        position: 'relative',
        background: 'var(--bg-app)',
      }}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '52px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontSize: '11px',
            fontWeight: 500,
            padding: '6px 12px',
            borderRadius: '20px',
            zIndex: 100,
            boxShadow: 'var(--shadow-md)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <CheckCircle2 size={12} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header — Apple Navigation Bar */}
      <div
        style={{
          position: 'relative',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (subpage !== 'main') {
              setSubpage('main');
            } else {
              onBack();
            }
          }}
          title={subpage !== 'main' ? 'Back to Settings' : 'Back to Wallet'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            padding: '4px 6px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          <ChevronLeft size={18} />
          <span>{subpage !== 'main' ? 'Settings' : 'Wallet'}</span>
        </button>

        {/* Mathematically Centered Title */}
        <span
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
          }}
        >
          {getSubpageTitle()}
        </span>

        <div style={{ width: '64px' }} />
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          paddingBottom: '36px',
        }}
      >
        {subpage === 'main' && renderMainMenu()}
        {subpage === 'network' && renderNetworkSubpage()}
        {subpage === 'currency_language' && renderCurrencyLanguageSubpage()}
        {subpage === 'autolock' && renderAutoLockSubpage()}
        {subpage === 'security' && renderSecuritySubpage()}
        {subpage === 'connected' && renderConnectedSubpage()}
        {subpage === 'about' && renderAboutSubpage()}
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', marginBottom: '8px' }}>
              <AlertTriangle size={20} />
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Reset Wallet?</h3>
            </div>
            <p className="text-secondary text-xs" style={{ lineHeight: 1.5, marginBottom: '14px' }}>
              This action will completely wipe your encrypted keystore, account keys, and preferences from this device. Unless you have backed up your 12-word recovery phrase, your funds will be permanently lost.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label className="label" style={{ marginBottom: '6px' }}>Type <strong>RESET</strong> to confirm:</label>
              <input
                type="text"
                className="input"
                placeholder="RESET"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmReset}
                disabled={resetConfirmInput.trim().toUpperCase() !== 'RESET' || isResetting}
                style={{
                  flex: 1,
                  background: 'var(--danger)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                }}
              >
                {isResetting ? 'Wiping…' : 'Wipe & Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
