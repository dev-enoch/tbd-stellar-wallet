import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SlideToConfirm } from '../common/SlideToConfirm';
import {
  Globe,
  Moon,
  Sun,
  Lock,
  Radio,
  Trash2,
  KeyRound,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Laptop,
} from 'lucide-react';

type SettingsTab = 'general' | 'network' | 'security' | 'dapps' | 'danger';

export const DesktopSettings: React.FC = () => {
  const {
    preferences,
    updatePreferences,
    revealPhrase,
    revealPrivateKey,
    resetWallet,
  } = useWallet();
  const { language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Security reveal state
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

  // Danger zone reset state
  const [isResetWiping, setIsResetWiping] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Password verification
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityPassword) return;
    setSecurityError('');
    setIsVerifyingSecurity(true);
    try {
      const phrase = await revealPhrase(securityPassword);
      const secret = await revealPrivateKey(securityPassword);
      setRevealedPhraseWords(phrase ? phrase.split(' ') : []);
      setRevealedSecretKey(secret || '');
      setIsSecurityUnlocked(true);
      setSecurityPassword('');
    } catch (err: any) {
      setSecurityError(err.message || 'Incorrect password.');
    } finally {
      setIsVerifyingSecurity(false);
    }
  };

  const handleCopyPhrase = () => {
    if (!revealedPhraseWords.length) return;
    navigator.clipboard.writeText(revealedPhraseWords.join(' '));
    setCopiedPhrase(true);
    setTimeout(() => setCopiedPhrase(false), 2000);
  };

  const handleCopySecretKey = () => {
    if (!revealedSecretKey) return;
    navigator.clipboard.writeText(revealedSecretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Reset wallet wipe
  const handleExecuteReset = async () => {
    setIsResetWiping(true);
    try {
      await resetWallet();
    } catch (err: any) {
      showToast(err.message || 'Failed to wipe wallet.');
      setIsResetWiping(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '72px',
            right: '32px',
            zIndex: 1000,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-focus)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '13px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Wallet Settings & Vault Security
        </h2>
        <p className="text-muted" style={{ margin: 0, fontSize: '12.5px' }}>
          Configure currency, RPC endpoints, cryptographic key backups, and permissions.
        </p>
      </div>

      {/* 2-Column Desktop Layout: Navigation Tabs on Left, Content on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left Nav Pills */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {(
            [
              { id: 'general' as const, label: 'General & Preferences', icon: <Globe size={15} /> },
              { id: 'network' as const, label: 'Network & Node RPC', icon: <Radio size={15} /> },
              { id: 'security' as const, label: 'Security & Secret Keys', icon: <KeyRound size={15} /> },
              { id: 'dapps' as const, label: 'Connected dApps', icon: <Laptop size={15} /> },
              { id: 'danger' as const, label: 'Reset Wallet', icon: <Trash2 size={15} />, color: 'var(--danger)' },
            ] as Array<{ id: SettingsTab; label: string; icon: React.ReactNode; color?: string }>
          ).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 700 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: isActive ? 'var(--bg-subtle)' : 'transparent',
                  color: item.color || (isActive ? 'var(--text-primary)' : 'var(--text-secondary)'),
                  transition: 'all 0.15s ease',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Panel */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            minHeight: '480px',
          }}
        >
          {/* =========================================================================
              TAB 1: GENERAL & PREFERENCES
              ========================================================================= */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>
                  General Preferences
                </h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>
                  Customize your currency display, visual theme, and language.
                </p>
              </div>

              {/* Fiat Currency */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Fiat Valuation Currency</div>
                  <div className="text-tertiary" style={{ fontSize: '11.5px' }}>
                    Portfolio values and DEX exchange rates will be displayed in this currency.
                  </div>
                </div>

                <select
                  className="select"
                  value={preferences.currency}
                  onChange={(e) => updatePreferences({ currency: e.target.value as any })}
                  style={{ width: '160px', height: '36px', fontSize: '12.5px' }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="NGN">NGN (₦)</option>
                </select>
              </div>

              {/* Interface Language */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Interface Language</div>
                  <div className="text-tertiary" style={{ fontSize: '11.5px' }}>
                    Select your preferred language for wallet alerts and interface elements.
                  </div>
                </div>

                <select
                  className="select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  style={{ width: '160px', height: '36px', fontSize: '12.5px' }}
                >
                  <option value="en">English (US)</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              {/* Color Theme */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Theme Appearance</div>
                  <div className="text-tertiary" style={{ fontSize: '11.5px' }}>
                    Toggle between sleek Dark mode and clean Light mode.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={toggleTheme}
                  style={{ gap: '8px', fontSize: '12.5px' }}
                >
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                  <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: NETWORK & NODE RPC
              ========================================================================= */}
          {activeTab === 'network' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>
                  Stellar Network & RPC Endpoints
                </h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>
                  Manage ledger connections and Soroban smart contract RPC endpoints.
                </p>
              </div>

              {/* Active Network */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Stellar Network</div>
                  <div className="text-tertiary" style={{ fontSize: '11.5px' }}>
                    Switch between production Mainnet, testnet sandbox, or futurenet.
                  </div>
                </div>

                <select
                  className="select"
                  value={preferences.network}
                  onChange={(e) => updatePreferences({ network: e.target.value as any })}
                  style={{ width: '180px', height: '36px', fontSize: '12.5px' }}
                >
                  <option value="testnet">Stellar Testnet</option>
                  <option value="mainnet">Stellar Public Mainnet</option>
                  <option value="futurenet">Soroban Futurenet</option>
                </select>
              </div>

              {/* Horizon Endpoint */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Horizon REST API Endpoint</label>
                <input
                  type="text"
                  className="input font-mono"
                  readOnly
                  value={
                    preferences.network === 'mainnet'
                      ? 'https://horizon.stellar.org'
                      : preferences.network === 'testnet'
                      ? 'https://horizon-testnet.stellar.org'
                      : 'https://horizon-futurenet.stellar.org'
                  }
                  style={{ background: 'var(--bg-subtle)', fontSize: '12px' }}
                />
              </div>

              {/* Soroban RPC */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Soroban Smart Contract RPC</label>
                <input
                  type="text"
                  className="input font-mono"
                  readOnly
                  value={
                    preferences.network === 'mainnet'
                      ? 'https://mainnet.sorobanrpc.com'
                      : preferences.network === 'testnet'
                      ? 'https://soroban-testnet.stellar.org'
                      : 'https://rpc-futurenet.stellar.org'
                  }
                  style={{ background: 'var(--bg-subtle)', fontSize: '12px' }}
                />
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: SECURITY & SECRET KEYS
              ========================================================================= */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>
                  Vault Security & Key Export
                </h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>
                  Safely export your 12-word mnemonic recovery phrase and secret key.
                </p>
              </div>

              {/* Auto-Lock Timer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Auto-Lock Inactivity Timer</div>
                  <div className="text-tertiary" style={{ fontSize: '11.5px' }}>
                    Automatically locks the wallet after a period of browser inactivity.
                  </div>
                </div>

                <select
                  className="select"
                  value={preferences.autoLockMinutes}
                  onChange={(e) => updatePreferences({ autoLockMinutes: parseInt(e.target.value, 10) })}
                  style={{ width: '160px', height: '36px', fontSize: '12.5px' }}
                >
                  <option value={1}>1 Minute</option>
                  <option value={5}>5 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={0}>Never Lock</option>
                </select>
              </div>

              {/* Hardware Blind Signing Option */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Allow Hardware Blind Signing</div>
                  <div className="text-tertiary" style={{ fontSize: '11.5px' }}>
                    Permits Ledger signing of complex Soroban contract calls that cannot display full parameters on-device.
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={preferences.allowBlindSigning}
                  onChange={(e) => updatePreferences({ allowBlindSigning: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Secret Key & Recovery Phrase Reveal */}
              {!isSecurityUnlocked ? (
                <form
                  onSubmit={handleVerifyPassword}
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={16} color="var(--accent)" />
                    <span style={{ fontSize: '13.5px', fontWeight: 700 }}>Enter Wallet Password to Reveal Keys</span>
                  </div>

                  {securityError && (
                    <div style={{ color: 'var(--danger)', fontSize: '12px' }}>
                      {securityError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="password"
                      className="input"
                      placeholder="Enter password..."
                      value={securityPassword}
                      onChange={(e) => setSecurityPassword(e.target.value)}
                      style={{ fontSize: '12.5px' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isVerifyingSecurity || !securityPassword}
                      style={{ flexShrink: 0, padding: '0 20px' }}
                    >
                      {isVerifyingSecurity ? 'Checking...' : 'Unlock Vault'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Tabs: Phrase vs Key */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSecurityTab('phrase')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '12px',
                        fontWeight: securityTab === 'phrase' ? 700 : 500,
                        border: securityTab === 'phrase' ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                        background: securityTab === 'phrase' ? 'var(--bg-subtle)' : 'transparent',
                        color: securityTab === 'phrase' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Recovery Phrase (12 Words)
                    </button>

                    <button
                      type="button"
                      onClick={() => setSecurityTab('private_key')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '12px',
                        fontWeight: securityTab === 'private_key' ? 700 : 500,
                        border: securityTab === 'private_key' ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                        background: securityTab === 'private_key' ? 'var(--bg-subtle)' : 'transparent',
                        color: securityTab === 'private_key' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Secret Key (S...)
                    </button>
                  </div>

                  {/* Phrase View */}
                  {securityTab === 'phrase' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '10px',
                          padding: '16px',
                          background: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {revealedPhraseWords.map((word, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>{idx + 1}.</span>
                            <span style={{ fontWeight: 600 }}>{word}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleCopyPhrase}
                        style={{ width: 'fit-content', gap: '6px' }}
                      >
                        {copiedPhrase ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                        <span>{copiedPhrase ? 'Phrase Copied' : 'Copy 12-Word Phrase'}</span>
                      </button>
                    </div>
                  )}

                  {/* Secret Key View */}
                  {securityTab === 'private_key' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        className="font-mono"
                        style={{
                          padding: '12px 14px',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12px',
                          wordBreak: 'break-all',
                        }}
                      >
                        {isSecretKeyMasked ? '••••••••••••••••••••••••••••••••••••••••••••••••••••••••' : revealedSecretKey}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setIsSecretKeyMasked(!isSecretKeyMasked)}
                          style={{ gap: '6px' }}
                        >
                          {isSecretKeyMasked ? <Eye size={14} /> : <EyeOff size={14} />}
                          <span>{isSecretKeyMasked ? 'Reveal Key' : 'Mask Key'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleCopySecretKey}
                          style={{ gap: '6px' }}
                        >
                          {copiedKey ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                          <span>{copiedKey ? 'Key Copied' : 'Copy Secret Key'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 4: CONNECTED DAPPS
              ========================================================================= */}
          {activeTab === 'dapps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>
                  Authorized Applications & dApps
                </h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>
                  Websites that currently have permission to request account balances and transaction signatures.
                </p>
              </div>

              <div
                style={{
                  padding: '36px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '12.5px',
                }}
              >
                No third-party web applications are currently authorized.
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 5: DANGER ZONE
              ========================================================================= */}
          {activeTab === 'danger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--danger)' }}>
                  Danger Zone: Reset Wallet
                </h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>
                  Irreversibly deletes all private keys, accounts, and preferences from this browser.
                </p>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--danger)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '12.5px',
                  color: 'var(--danger)',
                  lineHeight: 1.5,
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Warning:</strong> You will not be able to recover your funds unless you have backed up your 12-word mnemonic recovery phrase!
                </span>
              </div>

              <div style={{ maxWidth: '440px', marginTop: '10px' }}>
                <SlideToConfirm
                  onConfirm={handleExecuteReset}
                  label="Slide to Erase Wallet"
                  loadingLabel="Wiping Wallet Storage..."
                  isLoading={isResetWiping}
                  variant="danger"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
