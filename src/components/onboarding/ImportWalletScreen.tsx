import React, { useState } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { validateRecoveryPhrase } from '../../services/crypto';
import { StrKey } from '@stellar/stellar-sdk';
import { ArrowLeft, ArrowRight, AlertTriangle, Key } from 'lucide-react';

interface ImportWalletScreenProps {
  onBack: () => void;
  onImportMnemonic: (phrase: string, password: string) => Promise<void>;
  onImportSecretKey: (secretKey: string, password: string) => Promise<void>;
}

type Mode = 'mnemonic' | 'secretKey';

export const ImportWalletScreen: React.FC<ImportWalletScreenProps> = ({
  onBack,
  onImportMnemonic,
  onImportSecretKey,
}) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('mnemonic');

  const [phraseInput, setPhraseInput] = useState('');
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [step, setStep] = useState<'input' | 'password'>('input');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wordCount = phraseInput
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'mnemonic') {
      if (!validateRecoveryPhrase(phraseInput)) {
        setError(t.invalidMnemonic);
        return;
      }
    } else {
      if (!StrKey.isValidEd25519SecretSeed(secretKeyInput.trim())) {
        setError('Invalid Stellar secret key. Must start with S and be 56 characters.');
        return;
      }
    }
    setError('');
    setStep('password');
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(t.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      if (mode === 'mnemonic') {
        await onImportMnemonic(phraseInput.trim(), password);
      } else {
        await onImportSecretKey(secretKeyInput.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import wallet');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => {
            if (step === 'password') setStep('input');
            else onBack();
          }}
          disabled={isSubmitting}
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-xs text-muted" style={{ fontWeight: 600 }}>
          {step === 'input' ? 'Step 1/2' : 'Step 2/2'}
        </span>
      </div>

      {step === 'input' ? (
        <form onSubmit={handleInputSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div>
            <h2 className="text-lg" style={{ marginBottom: '6px' }}>{t.importTitle}</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>{t.importDesc}</p>

            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`btn btn-sm ${mode === 'mnemonic' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setMode('mnemonic');
                  setError('');
                }}
              >
                12-Word Phrase
              </button>
              <button
                type="button"
                className={`btn btn-sm ${mode === 'secretKey' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setMode('secretKey');
                  setError('');
                }}
              >
                <Key size={12} />
                <span>Secret Key</span>
              </button>
            </div>

            {mode === 'mnemonic' ? (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="label">{t.backupPhraseTitle}</label>
                  <span className="badge" style={{ fontSize: '10px' }}>
                    {wordCount} / 12 words
                  </span>
                </div>
                <textarea
                  className="textarea font-mono"
                  rows={4}
                  placeholder={t.mnemonicPlaceholder}
                  value={phraseInput}
                  onChange={(e) => {
                    setPhraseInput(e.target.value);
                    setError('');
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <div className="form-group">
                <div className="banner banner-warning" style={{ marginBottom: '12px' }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>{t.secretKeyWarn}</div>
                </div>
                <label className="label">{t.secretKeyOption}</label>
                <input
                  type="password"
                  className="input font-mono"
                  placeholder="S…"
                  value={secretKeyInput}
                  onChange={(e) => {
                    setSecretKeyInput(e.target.value);
                    setError('');
                  }}
                  autoFocus
                />
              </div>
            )}

            {error && <div className="input-error-msg">{error}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={mode === 'mnemonic' ? wordCount !== 12 : !secretKeyInput.trim()}
          >
            <span>{t.continueBtn}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        <form onSubmit={handleFinalSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div>
            <h2 className="text-lg" style={{ marginBottom: '6px' }}>{t.setPasswordTitle}</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '20px' }}>{t.setPasswordDesc}</p>

            <div className="form-group">
              <label className="label">{t.enterPassword}</label>
              <input
                type="password"
                className="input"
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="label">{t.confirmPasswordPlaceholder}</label>
              <input
                type="password"
                className="input"
                placeholder={t.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                required
              />
              {error && <div className="input-error-msg">{error}</div>}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
            {isSubmitting ? <span>{t.loading}</span> : <span>{t.verifyAndFinish}</span>}
          </button>
        </form>
      )}
    </div>
  );
};
