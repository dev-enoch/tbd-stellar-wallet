import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { generateRecoveryPhrase } from '../../services/crypto';
import {
  Shield,
  ArrowRight,
  Download,
  PlusCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  ArrowLeft,
  Sun,
  Moon,
} from 'lucide-react';

interface DesktopOnboardingProps {
  onCreateComplete: (phrase: string, password: string) => Promise<void>;
  onImportMnemonic: (phrase: string, password: string) => Promise<void>;
  onImportSecretKey: (secret: string, password: string) => Promise<void>;
}

type OnboardingMode = 'welcome' | 'create' | 'import';
type CreateStep = 'password' | 'reveal' | 'verify';
type ImportTab = 'mnemonic' | 'secret';

export const DesktopOnboarding: React.FC<DesktopOnboardingProps> = ({
  onCreateComplete,
  onImportMnemonic,
  onImportSecretKey,
}) => {
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<OnboardingMode>('welcome');

  // Create Mode State
  const [createStep, setCreateStep] = useState<CreateStep>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [copiedPhrase, setCopiedPhrase] = useState(false);
  const [hasBackedUp, setHasBackedUp] = useState(false);

  const phrase = useMemo(() => generateRecoveryPhrase(), []);
  const words = useMemo(() => phrase.split(' '), [phrase]);
  const quizIndices = useMemo(() => [2, 6, 10], []); // words #3, #7, #11
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizError, setQuizError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import Mode State
  const [importTab, setImportTab] = useState<ImportTab>('mnemonic');
  const [importInput, setImportInput] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importConfirmPassword, setImportConfirmPassword] = useState('');
  const [importError, setImportError] = useState('');

  // Handle Copy Phrase
  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(phrase);
    setCopiedPhrase(true);
    setTimeout(() => setCopiedPhrase(false), 2000);
  };

  // Submit Password in Create Flow
  const handleCreatePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError('');
    setCreateStep('reveal');
  };

  // Submit Verification Quiz in Create Flow
  const handleQuizSubmit = async () => {
    for (const idx of quizIndices) {
      const expected = words[idx];
      const answer = (quizAnswers[idx] || '').trim().toLowerCase();
      if (answer !== expected) {
        setQuizError(`Word #${idx + 1} does not match.`);
        return;
      }
    }
    setQuizError('');
    setIsSubmitting(true);
    try {
      await onCreateComplete(phrase, password);
    } catch (err: any) {
      setQuizError(err.message || 'Failed to initialize wallet.');
      setIsSubmitting(false);
    }
  };

  // Submit Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');

    if (importPassword.length < 8) {
      setImportError('Password must be at least 8 characters long.');
      return;
    }
    if (importPassword !== importConfirmPassword) {
      setImportError('Passwords do not match.');
      return;
    }

    const trimmedInput = importInput.trim();
    if (!trimmedInput) {
      setImportError('Please enter your recovery phrase or secret key.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (importTab === 'mnemonic') {
        const wordCount = trimmedInput.split(/\s+/).length;
        if (wordCount !== 12 && wordCount !== 24) {
          setImportError(`Expected 12 or 24 words, but got ${wordCount}.`);
          setIsSubmitting(false);
          return;
        }
        await onImportMnemonic(trimmedInput, importPassword);
      } else {
        if (!trimmedInput.startsWith('S') || trimmedInput.length !== 56) {
          setImportError('Invalid Stellar secret key (must start with S and be 56 characters).');
          setIsSubmitting(false);
          return;
        }
        await onImportSecretKey(trimmedInput, importPassword);
      }
    } catch (err: any) {
      setImportError(err.message || 'Import failed. Check your inputs.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/Stellith_logo.jpg"
            alt="Stellith Logo"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              objectFit: 'contain',
              filter: theme === 'dark' ? 'invert(1)' : 'none',
            }}
          />
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Stellith Desktop
          </span>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          style={{ padding: '6px' }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Main Centered Container */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          className="panel"
          style={{
            width: '100%',
            maxWidth: mode === 'create' && createStep === 'reveal' ? '760px' : '560px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: '36px',
            transition: 'max-width 0.2s ease',
          }}
        >
          {/* WELCOME VIEW */}
          {mode === 'welcome' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                  Welcome to Stellith
                </h1>
                <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                  The non-custodial browser extension & desktop wallet for Stellar and Soroban smart accounts.
                </p>
              </div>

              {/* 2 Big Choice Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                {/* Create Card */}
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '24px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                      marginBottom: '14px',
                    }}
                  >
                    <PlusCircle size={22} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                    Create New Wallet
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Generate a fresh 12-word recovery phrase and activate your on-chain Stellar keys.
                  </div>
                </button>

                {/* Import Card */}
                <button
                  type="button"
                  onClick={() => setMode('import')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '24px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                      marginBottom: '14px',
                    }}
                  >
                    <Download size={22} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                    Import Existing Wallet
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Restore an existing wallet using your 12 or 24-word recovery phrase or secret key.
                  </div>
                </button>
              </div>

              {/* Security info strip */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                <Shield size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                <span>
                  Your private keys are encrypted locally on this machine using AES-GCM and never leave your device.
                </span>
              </div>
            </div>
          )}

          {/* CREATE WALLET FLOW */}
          {mode === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (createStep === 'reveal') setCreateStep('password');
                  else if (createStep === 'verify') setCreateStep('reveal');
                  else setMode('welcome');
                }}
                style={{ alignSelf: 'flex-start', gap: '4px', padding: '2px 6px' }}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              {/* Step 1: Password */}
              {createStep === 'password' && (
                <form onSubmit={handleCreatePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
                      Set Wallet Password
                    </h2>
                    <p className="text-muted text-xs" style={{ margin: 0 }}>
                      This password encrypts your keys locally and unlocks your wallet on this desktop browser.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="label">New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="input"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label">Confirm Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  {passwordError && (
                    <div style={{ fontSize: '12px', color: 'var(--danger)' }}>{passwordError}</div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ marginTop: '8px', width: '100%', gap: '6px' }}
                  >
                    <span>Continue to Recovery Phrase</span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              )}

              {/* Step 2: Reveal 12 Words in a 3x4 Grid */}
              {createStep === 'reveal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
                      Your 12-Word Recovery Phrase
                    </h2>
                    <p className="text-muted text-xs" style={{ margin: 0 }}>
                      Write down these 12 words in order and store them in a secure location. Anyone with this phrase can access your funds.
                    </p>
                  </div>

                  {/* 3x4 Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '10px',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {words.map((w, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'var(--bg-surface)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '13px',
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', width: '20px' }}>
                          {idx + 1}.
                        </span>
                        <span className="font-mono" style={{ fontWeight: 600 }}>
                          {w}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCopyPhrase}
                      style={{ gap: '6px' }}
                    >
                      {copiedPhrase ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                      <span>{copiedPhrase ? 'Copied to Clipboard' : 'Copy All Words'}</span>
                    </button>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={hasBackedUp}
                        onChange={(e) => setHasBackedUp(e.target.checked)}
                      />
                      <span>I have written down my phrase</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    disabled={!hasBackedUp}
                    onClick={() => setCreateStep('verify')}
                    style={{ width: '100%', marginTop: '8px', gap: '6px' }}
                  >
                    <span>Verify Phrase</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* Step 3: Verification Quiz */}
              {createStep === 'verify' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
                      Verify Recovery Phrase
                    </h2>
                    <p className="text-muted text-xs" style={{ margin: 0 }}>
                      Enter the requested words to verify that you safely stored your backup phrase.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {quizIndices.map((idx) => (
                      <div key={idx} className="form-group" style={{ margin: 0 }}>
                        <label className="label">Word #{idx + 1}</label>
                        <input
                          type="text"
                          className="input font-mono"
                          placeholder={`Enter word #${idx + 1}`}
                          value={quizAnswers[idx] || ''}
                          onChange={(e) =>
                            setQuizAnswers({ ...quizAnswers, [idx]: e.target.value.toLowerCase().trim() })
                          }
                        />
                      </div>
                    ))}
                  </div>

                  {quizError && (
                    <div style={{ fontSize: '12px', color: 'var(--danger)' }}>{quizError}</div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    disabled={isSubmitting}
                    onClick={handleQuizSubmit}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    {isSubmitting ? 'Initializing Wallet…' : 'Complete Setup & Open Dashboard'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* IMPORT WALLET FLOW */}
          {mode === 'import' && (
            <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setMode('welcome')}
                style={{ alignSelf: 'flex-start', gap: '4px', padding: '2px 6px' }}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
                  Import Existing Wallet
                </h2>
                <p className="text-muted text-xs" style={{ margin: 0 }}>
                  Enter your 12 or 24-word seed phrase, or a Stellar secret key (starts with S).
                </p>
              </div>

              {/* Tab Switcher */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-subtle)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
                <button
                  type="button"
                  onClick={() => setImportTab('mnemonic')}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: '12px',
                    fontWeight: importTab === 'mnemonic' ? 700 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    background: importTab === 'mnemonic' ? 'var(--bg-surface)' : 'transparent',
                    color: importTab === 'mnemonic' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Recovery Phrase (12/24 words)
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('secret')}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: '12px',
                    fontWeight: importTab === 'secret' ? 700 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    background: importTab === 'secret' ? 'var(--bg-surface)' : 'transparent',
                    color: importTab === 'secret' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Stellar Secret Key (S...)
                </button>
              </div>

              {/* Input Field */}
              <div className="form-group" style={{ margin: 0 }}>
                <textarea
                  className="input font-mono"
                  rows={importTab === 'mnemonic' ? 3 : 2}
                  style={{ fontSize: '13px', lineHeight: 1.5, resize: 'none' }}
                  placeholder={
                    importTab === 'mnemonic'
                      ? 'e.g. apple banana cherry dog elephant fox grape hat ice jaguar kite lemon'
                      : 'e.g. SBQOXC75X5WBLJ4T4W3F2QYDFW2T3U35L5Z3ZJ46VMBP27Q6DFY5U4M3'
                  }
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Password Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="At least 8 chars"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Confirm Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Re-enter password"
                    value={importConfirmPassword}
                    onChange={(e) => setImportConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {importError && (
                <div style={{ fontSize: '12px', color: 'var(--danger)' }}>{importError}</div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isSubmitting}
                style={{ width: '100%', marginTop: '8px' }}
              >
                {isSubmitting ? 'Importing Wallet…' : 'Import Wallet & Open Dashboard'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
