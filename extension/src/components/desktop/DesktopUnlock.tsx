import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatAddress } from '../../services/stellar';
import { DAppSandbox } from '../dapp/DAppSandbox';
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertTriangle,
  Code2,
  X,
} from 'lucide-react';
import { SlideToConfirm } from '../common/SlideToConfirm';

interface DesktopUnlockProps {
  onUnlock: (password: string) => Promise<boolean | void>;
  onReset: () => Promise<void>;
}

export const DesktopUnlock: React.FC<DesktopUnlockProps> = ({ onUnlock, onReset }) => {
  const { activeAccount, preferences } = useWallet();
  const { theme, toggleTheme } = useTheme();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onUnlock(password);
      if (ok === false) {
        setError('Incorrect password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Unlock failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReset = async () => {
    setIsSubmitting(true);
    try {
      await onReset();
      setShowResetConfirm(false);
    } catch (err: any) {
      setError(err.message || 'Reset failed.');
    } finally {
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
            Stellith
          </span>
          <span className="badge badge-accent" style={{ fontSize: '10px', textTransform: 'capitalize' }}>
            {preferences.network}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSandbox(!showSandbox)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <Code2 size={14} />
            <span>{showSandbox ? 'Hide Dev Sandbox' : 'dApp Sandbox'}</span>
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            style={{ padding: '6px' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Main Centered Unlock Area */}
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
            maxWidth: '440px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: '36px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Logo with subtle halo */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            <Lock size={26} color="var(--accent)" />
          </div>

          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Unlock Stellith
            </h1>
            <p className="text-muted text-xs" style={{ margin: 0 }}>
              Enter your password to access your Stellar & Soroban accounts
            </p>
            {activeAccount && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-subtle)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  marginTop: '10px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <span>{activeAccount.name}</span>
                <span className="font-mono text-muted">({formatAddress(activeAccount.publicKey, 4)})</span>
              </div>
            )}
          </div>

          {!showResetConfirm ? (
            <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    style={{ paddingRight: '40px', fontSize: '14px', height: '44px' }}
                    placeholder="Enter wallet password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ fontSize: '12px', color: 'var(--danger)', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isSubmitting || !password}
                style={{ width: '100%', gap: '8px' }}
              >
                <Unlock size={16} />
                <span>{isSubmitting ? 'Unlocking…' : 'Unlock Wallet'}</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowResetConfirm(true)}
                  style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}
                >
                  Forgot password? Reset wallet
                </button>
              </div>
            </form>
          ) : (
            /* Reset Confirmation Dialog */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                textAlign: 'left',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-subtle)',
                border: '1px solid var(--danger)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 700, fontSize: '13px' }}>
                <AlertTriangle size={16} />
                <span>Resetting will wipe local wallet data</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                You will need your 12-word recovery phrase or secret key to restore your funds. Ensure you have your backup before resetting.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <SlideToConfirm
                  variant="danger"
                  label="Slide to Wipe & Reset Wallet"
                  loadingLabel="Resetting Local Wallet…"
                  onConfirm={handleConfirmReset}
                  isLoading={isSubmitting}
                  height={44}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowResetConfirm(false)}
                  style={{ width: '100%', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Developer Sandbox Drawer if toggled */}
      {showSandbox && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '420px',
            background: 'var(--bg-surface)',
            borderTop: '2px solid var(--border-focus)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>dApp Provider Test Harness</span>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowSandbox(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            <DAppSandbox />
          </div>
        </div>
      )}
    </div>
  );
};
