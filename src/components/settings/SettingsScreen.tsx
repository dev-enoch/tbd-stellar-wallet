import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ArrowLeft,
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
  ExternalLink,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { preferences, updatePreferences, revealPhrase, resetWallet, accounts } = useWallet();
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  // Reveal Phrase Modal State
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
  const [revealPassword, setRevealPassword] = useState('');
  const [revealedWords, setRevealedWords] = useState<string[] | null>(null);
  const [revealError, setRevealError] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  // Reset Wallet Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Success Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleRevealPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevealError('');
    setIsRevealing(true);
    try {
      const phrase = await revealPhrase(revealPassword);
      setRevealedWords(phrase.trim().split(/\s+/));
    } catch {
      setRevealError(t.incorrectPassword || 'Incorrect password');
    } finally {
      setIsRevealing(false);
    }
  };

  const handleCopyPhrase = () => {
    if (revealedWords) {
      navigator.clipboard.writeText(revealedWords.join(' '));
      setCopiedPhrase(true);
      setTimeout(() => setCopiedPhrase(false), 2000);
    }
  };

  const handleRevokeSite = async (origin: string) => {
    const updated = preferences.connectedSites.filter((s) => s.origin !== origin);
    await updatePreferences({ connectedSites: updated });
    showToast(`Revoked access for ${origin}`);
  };

  const handleRevokeAllSites = async () => {
    await updatePreferences({ connectedSites: [] });
    showToast('Revoked all connected dApps');
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflowY: 'auto',
      }}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--text-primary)',
            color: 'var(--bg-app)',
            padding: '8px 16px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 500,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <CheckCircle2 size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          className="btn btn-ghost btn-icon"
          onClick={onBack}
          aria-label={t.back}
          style={{ padding: '6px' }}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, flex: 1 }}>
          {t.settingsTitle}
        </h2>
        <span
          style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-app)',
            color: 'var(--text-secondary)',
            fontWeight: 600,
          }}
        >
          v1.0.0
        </span>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Network Selection */}
        <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
            <Radio size={16} />
            <span>{t.networkLabel}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className={`btn ${preferences.network === 'testnet' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => updatePreferences({ network: 'testnet' })}
              style={{ fontSize: '12px', padding: '8px 10px', justifyContent: 'center' }}
            >
              Testnet
            </button>
            <button
              type="button"
              className={`btn ${preferences.network === 'mainnet' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => updatePreferences({ network: 'mainnet' })}
              style={{ fontSize: '12px', padding: '8px 10px', justifyContent: 'center' }}
            >
              Public / Mainnet
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {preferences.network === 'testnet'
              ? 'Testnet is a free Stellar testing network with Friendbot test tokens.'
              : 'Mainnet handles real Stellar network assets and live transaction fees.'}
          </div>
        </div>

        {/* Currency & Language */}
        <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Currency */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <DollarSign size={16} />
              <span>{t.currencyLabel}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {(['USD', 'EUR', 'NGN', 'GBP'] as const).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  className={`btn ${preferences.currency === curr ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => updatePreferences({ currency: curr })}
                  style={{ fontSize: '11px', padding: '6px 4px', justifyContent: 'center', fontWeight: 600 }}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

          {/* Language */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <Globe size={16} />
              <span>{t.languageLabel}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn ${language === 'en' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setLanguage('en')}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                English
              </button>
              <button
                type="button"
                className={`btn ${language === 'ha' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setLanguage('ha')}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                Hausa
              </button>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

          {/* Theme */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              <span>{t.themeLabel}</span>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={toggleTheme}
              style={{ fontSize: '11px', padding: '4px 12px', display: 'flex', gap: '6px', alignItems: 'center' }}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={12} />
                  <span>{t.themeLight}</span>
                </>
              ) : (
                <>
                  <Moon size={12} />
                  <span>{t.themeDark}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security & Auto-lock */}
        <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Auto Lock Timer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <Lock size={16} />
              <span>{t.autoLockTimer}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
              {[
                { label: '5m', val: 5 },
                { label: '15m', val: 15 },
                { label: '30m', val: 30 },
                { label: '1h', val: 60 },
                { label: 'Off', val: 0 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  type="button"
                  className={`btn ${preferences.autoLockMinutes === val ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => updatePreferences({ autoLockMinutes: val })}
                  style={{ fontSize: '11px', padding: '6px 2px', justifyContent: 'center' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

          {/* Reveal Phrase */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <KeyRound size={16} />
              <span>{t.revealPhrase}</span>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setIsRevealModalOpen(true);
                setRevealedWords(null);
                setRevealPassword('');
                setRevealError('');
              }}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Reveal
            </button>
          </div>
        </div>

        {/* Connected Applications (dApps) */}
        <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <Shield size={16} />
              <span>{t.connectedSites}</span>
            </div>
            {preferences.connectedSites && preferences.connectedSites.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleRevokeAllSites}
                style={{ fontSize: '11px', color: 'var(--text-danger)', padding: '2px 6px' }}
              >
                Disconnect All
              </button>
            )}
          </div>

          {preferences.connectedSites && preferences.connectedSites.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {preferences.connectedSites.map((site) => (
                <div
                  key={site.origin}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{site.origin}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Connected {new Date(site.connectedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => handleRevokeSite(site.origin)}
                    title={t.revokeAccess}
                    style={{ color: 'var(--text-danger)', padding: '4px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '8px 0' }}>
              {t.noConnectedSites}
            </div>
          )}
        </div>

        {/* About TBD Wallet */}
        <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
            <Info size={16} />
            <span>{t.aboutTitle}</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            TBD is a non-custodial browser extension wallet designed with cryptographic rigor, plain-language
            explainability, and strict privacy. Keys are generated client-side and never touch an external server.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {accounts.length} active account{accounts.length > 1 ? 's' : ''}
            </span>
            <a
              href="https://github.com/dev-enoch/tbd-stellar-wallet"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              <span>GitHub Repository</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Danger Zone: Reset Wallet */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-danger, #f87171)',
            background: 'var(--bg-danger-subtle, rgba(239, 68, 68, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-danger)', fontWeight: 600, fontSize: '13px' }}>
            <AlertTriangle size={16} />
            <span>{t.resetWallet}</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {t.resetConfirmWarning}
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setIsResetModalOpen(true);
              setResetConfirmInput('');
            }}
            style={{
              color: 'var(--text-danger)',
              borderColor: 'var(--text-danger)',
              fontSize: '12px',
              padding: '8px',
              justifyContent: 'center',
            }}
          >
            {t.resetWallet}
          </button>
        </div>
      </div>

      {/* Reveal Recovery Phrase Modal */}
      {isRevealModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '340px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title">{t.revealPhrase}</h3>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setIsRevealModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {!revealedWords ? (
              <form onSubmit={handleRevealPhrase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Enter your wallet password to unlock and reveal your secret recovery phrase.
                </p>
                <input
                  type="password"
                  className="input"
                  placeholder={t.enterPassword}
                  value={revealPassword}
                  onChange={(e) => setRevealPassword(e.target.value)}
                  autoFocus
                  required
                />
                {revealError && (
                  <div style={{ fontSize: '11px', color: 'var(--text-danger)' }}>{revealError}</div>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsRevealModalOpen(false)}
                  >
                    {t.cancel}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isRevealing}>
                    {isRevealing ? t.loading : 'Unlock & Show'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-danger-subtle, rgba(239, 68, 68, 0.08))',
                    border: '1px solid var(--border-danger, #f87171)',
                    fontSize: '11px',
                    color: 'var(--text-danger)',
                    lineHeight: 1.4,
                  }}
                >
                  Never share your recovery phrase with anyone. Anyone who has these 12 words has total control over your funds.
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {revealedWords.map((word, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '11px',
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                        fontFamily: 'monospace',
                      }}
                    >
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '9px', width: '14px' }}>
                        {i + 1}.
                      </span>
                      <span style={{ fontWeight: 600 }}>{word}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCopyPhrase}
                    style={{ fontSize: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}
                  >
                    {copiedPhrase ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedPhrase ? t.copied : t.copy}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsRevealModalOpen(false)}
                  >
                    {t.done}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '340px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--text-danger)' }}>
                {t.resetWallet}
              </h3>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setIsResetModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                This is a permanent action. All keys and data will be erased from local storage.
                To confirm, please type <strong>RESET</strong> in the box below:
              </p>

              <input
                type="text"
                className="input"
                placeholder="RESET"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                autoFocus
              />

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsResetModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmReset}
                  disabled={resetConfirmInput.trim().toUpperCase() !== 'RESET' || isResetting}
                  style={{
                    background: 'var(--text-danger, #ef4444)',
                    borderColor: 'var(--text-danger, #ef4444)',
                    color: '#ffffff',
                  }}
                >
                  {isResetting ? t.loading : 'Delete Wallet Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
