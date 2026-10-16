import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { createPasskeyAccount } from '../../services/passkey';
import { Key, Fingerprint, Check, AlertCircle, RefreshCw, X } from 'lucide-react';

interface PasskeyCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasskeyCreateModal: React.FC<PasskeyCreateModalProps> = ({ isOpen, onClose }) => {
  const { addPasskeyAccount } = useWallet();
  const [nickname, setNickname] = useState('Passkey Smart Account');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdAddress, setCreatedAddress] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { credential } = await createPasskeyAccount(nickname.trim() || 'Passkey Smart Account');

      // Add account to wallet context as a passkey smart contract account
      await addPasskeyAccount(
        credential.contractAddress,
        credential.credentialId,
        nickname.trim() || 'Passkey Smart Account'
      );
      setCreatedAddress(credential.contractAddress);
    } catch (err: any) {
      setError(err.message || 'Failed to create passkey credential.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    setCreatedAddress(null);
    setNickname('Passkey Smart Account');
    setError('');
    onClose();
  };

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 600;

  return (
    <div
      style={{
        position: isDesktop ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDesktop ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.7)',
        backdropFilter: isDesktop ? 'blur(8px)' : 'blur(4px)',
        zIndex: isDesktop ? 1010 : 60,
        display: 'flex',
        alignItems: isDesktop ? 'center' : 'stretch',
        justifyContent: isDesktop ? 'center' : 'flex-end',
        flexDirection: 'column',
        padding: isDesktop ? '20px' : 0,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDone();
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          borderRadius: isDesktop ? '16px' : undefined,
          border: isDesktop ? '1px solid var(--border-subtle)' : undefined,
          borderTop: !isDesktop ? '1px solid var(--border-subtle)' : undefined,
          borderTopLeftRadius: !isDesktop ? 'var(--radius-lg)' : undefined,
          borderTopRightRadius: !isDesktop ? 'var(--radius-lg)' : undefined,
          padding: isDesktop ? '22px 24px' : '20px 16px',
          width: '100%',
          maxWidth: isDesktop ? '480px' : '100%',
          maxHeight: isDesktop ? '85vh' : '90%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDesktop ? '0 24px 64px rgba(0, 0, 0, 0.7)' : 'var(--shadow-md)',
          animation: 'fadeIn 0.18s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Fingerprint size={18} />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Passkey Smart Account</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleDone} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '12px', lineHeight: 1.4 }}>{error}</span>
          </div>
        )}

        {!createdAddress ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                No recovery phrase needed
              </div>
              Your account is secured by your device biometrics (Face ID, Touch ID, or Windows Hello PIN) through WebAuthn secp256r1 smart contracts.
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Account Nickname
              </label>
              <input
                type="text"
                className="input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="My Smart Account"
              />
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              <strong>Sponsored Fees:</strong> Stellith covers network transaction fees for up to 5 transactions per day on passkey accounts.
            </div>

            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={isLoading}
              style={{ width: '100%', marginTop: '4px' }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Prompting Device Biometrics...</span>
                </>
              ) : (
                <>
                  <Key size={14} />
                  <span>Create with Face ID / PIN</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-focus)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <Check size={22} />
            </div>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>Passkey Account Ready!</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                {nickname} was created successfully.
              </p>
            </div>

            <div
              className="font-mono"
              style={{
                padding: '8px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '11px',
                wordBreak: 'break-all',
              }}
            >
              {createdAddress}
            </div>

            <button className="btn btn-primary" onClick={handleDone} style={{ width: '100%' }}>
              Start Transacting
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
