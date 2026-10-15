import React, { useState, useMemo } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { generateRecoveryPhrase } from '../../services/crypto';
import { Eye, EyeOff, Check, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';

interface CreateWalletScreenProps {
  onBack: () => void;
  onComplete: (phrase: string, password: string) => Promise<void>;
}

type Step = 'password' | 'reveal' | 'verify';

export const CreateWalletScreen: React.FC<CreateWalletScreenProps> = ({ onBack, onComplete }) => {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('password');

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Generated phrase
  const phrase = useMemo(() => generateRecoveryPhrase(), []);
  const words = useMemo(() => phrase.split(' '), [phrase]);

  // Reveal state
  const [isRevealed, setIsRevealed] = useState(false);
  const [acknowledgedBackup, setAcknowledgedBackup] = useState(false);

  // Quiz state: choose 3 distinct random word indices (0 to 11)
  const quizIndices = useMemo(() => [2, 6, 10], []); // words #3, #7, #11
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizError, setQuizError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setPasswordError(t.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError(t.passwordMismatch);
      return;
    }
    setPasswordError('');
    setStep('reveal');
  };

  const handleQuizSubmit = async () => {
    // Validate each requested word
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
      await onComplete(phrase, password);
    } catch (err: any) {
      setQuizError(err.message || 'Failed to complete wallet setup');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => {
            if (step === 'password') onBack();
            else if (step === 'reveal') setStep('password');
            else if (step === 'verify') setStep('reveal');
          }}
          disabled={isSubmitting}
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-xs text-muted" style={{ fontWeight: 600 }}>
          {step === 'password' ? 'Step 1/3' : step === 'reveal' ? 'Step 2/3' : 'Step 3/3'}
        </span>
      </div>

      {/* STEP 1: PASSWORD */}
      {step === 'password' && (
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div>
            <h2 className="text-lg" style={{ marginBottom: '6px' }}>{t.setPasswordTitle}</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '20px' }}>{t.setPasswordDesc}</p>

            <div className="form-group">
              <label className="label">{t.enterPassword}</label>
              <input
                type="password"
                className={`input ${passwordError ? 'input-error' : ''}`}
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="label">{t.confirmPasswordPlaceholder}</label>
              <input
                type="password"
                className={`input ${passwordError ? 'input-error' : ''}`}
                placeholder={t.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError('');
                }}
                required
              />
              {passwordError && <div className="input-error-msg">{passwordError}</div>}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg">
            <span>{t.continueBtn}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      )}

      {/* STEP 2: PHRASE REVEAL */}
      {step === 'reveal' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div>
            <h2 className="text-lg" style={{ marginBottom: '6px' }}>{t.backupPhraseTitle}</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '14px' }}>{t.backupPhraseDesc}</p>

            <div className="banner banner-warning">
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{t.noScreenshotsWarn}</div>
            </div>

            {/* Mnemonic Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                padding: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                filter: isRevealed ? 'none' : 'blur(4px)',
                userSelect: 'none',
                transition: 'filter 0.2s ease',
              }}
            >
              {words.map((word, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    padding: '6px 8px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-muted)',
                  }}
                >
                  <span className="text-tertiary font-mono" style={{ fontSize: '10px' }}>{index + 1}.</span>
                  <span style={{ fontWeight: 500 }}>{word}</span>
                </div>
              ))}
            </div>

            {/* Hold to reveal control */}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onMouseDown={() => setIsRevealed(true)}
                onMouseUp={() => setIsRevealed(false)}
                onTouchStart={() => setIsRevealed(true)}
                onTouchEnd={() => setIsRevealed(false)}
                style={{ width: '100%', gap: '6px' }}
              >
                {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{isRevealed ? t.releaseToHide : t.holdToReveal}</span>
              </button>
            </div>

            {/* Acknowledgment checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginTop: '16px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              <input
                type="checkbox"
                checked={acknowledgedBackup}
                onChange={(e) => setAcknowledgedBackup(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>{t.savedPhraseConfirm}</span>
            </label>
          </div>

          <button
            className="btn btn-primary btn-lg"
            disabled={!acknowledgedBackup}
            onClick={() => setStep('verify')}
          >
            <span>{t.next}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* STEP 3: WORD-CHECK QUIZ */}
      {step === 'verify' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div>
            <h2 className="text-lg" style={{ marginBottom: '6px' }}>{t.phraseQuizTitle}</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '18px' }}>{t.phraseQuizDesc}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {quizIndices.map((wordIndex) => (
                <div key={wordIndex} className="form-group" style={{ margin: 0 }}>
                  <label className="label">
                    <span>{t.wordInputPrompt.replace('{num}', String(wordIndex + 1))}</span>
                  </label>
                  <input
                    type="text"
                    className="input font-mono"
                    placeholder={`Enter word #${wordIndex + 1}`}
                    value={quizAnswers[wordIndex] || ''}
                    onChange={(e) => {
                      setQuizAnswers({ ...quizAnswers, [wordIndex]: e.target.value });
                      setQuizError('');
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              ))}
            </div>

            {quizError && <div className="input-error-msg" style={{ marginTop: '12px' }}>{quizError}</div>}
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleQuizSubmit}
            disabled={isSubmitting || quizIndices.some((idx) => !(quizAnswers[idx] || '').trim())}
          >
            {isSubmitting ? (
              <span>{t.loading}</span>
            ) : (
              <>
                <Check size={16} />
                <span>{t.verifyAndFinish}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
