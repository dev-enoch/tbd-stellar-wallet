import React, { useState } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface UnlockScreenProps {
  onUnlock: (password: string) => Promise<void>;
  onReset: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ onUnlock, onReset }) => {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotInfo, setShowForgotInfo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onUnlock(password);
    } catch {
      setError(t.incorrectPassword);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '32px 20px 24px', justifyContent: 'space-between', overflowY: 'auto' }}>
      <div>
        <div style={{ textAlign: 'center', marginBottom: '28px', marginTop: '16px' }}>
          <img
            src="/Stellith_logo.jpg"
            alt="Stellith Logo"
            style={{
              width: '44px',
              height: '44px',
              objectFit: 'contain',
              borderRadius: '8px',
              marginBottom: '12px',
              filter: theme === 'dark' ? 'invert(1)' : 'none',
            }}
          />
          <h2 className="text-lg">{t.unlockTitle}</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="password"
              className={`input ${error ? 'input-error' : ''}`}
              placeholder={t.enterPassword}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              autoFocus
              required
            />
            {error && <div className="input-error-msg">{error}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting || !password}
            style={{ marginTop: '8px' }}
          >
            {isSubmitting ? <span>{t.loading}</span> : <span>{t.unlockBtn}</span>}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowForgotInfo(!showForgotInfo)}
            style={{ fontSize: '12px' }}
          >
            {t.forgotPassword}
          </button>
        </div>

        {showForgotInfo && (
          <div className="panel-subtle" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--warning)' }} />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                <p style={{ marginBottom: '8px' }}>{t.forgotPasswordDesc}</p>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={onReset}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <RefreshCw size={12} />
                  <span>{t.resetWallet}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <span className="text-xs text-tertiary">Stellith v1.0.0</span>
      </div>
    </div>
  );
};
