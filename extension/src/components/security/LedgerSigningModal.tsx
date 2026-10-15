import React from 'react';
import { Cpu, RefreshCw, AlertCircle, X } from 'lucide-react';
import { formatAddress } from '../../services/stellar';

interface LedgerSigningModalProps {
  isOpen: boolean;
  destination?: string;
  amount?: string;
  assetCode?: string;
  memo?: string;
  fee?: string;
  network?: string;
  error?: string;
  onCancel: () => void;
}

export const LedgerSigningModal: React.FC<LedgerSigningModalProps> = ({
  isOpen,
  destination,
  amount,
  assetCode,
  memo,
  fee = '0.0000100 XLM',
  network = 'testnet',
  error,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 16px',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Confirm on Ledger</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onCancel} style={{ padding: '2px' }}>
            <X size={16} />
          </button>
        </div>

        {error ? (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '12px', lineHeight: 1.4 }}>{error}</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
              <RefreshCw size={18} className="spin" />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>
                Review details on your device screen...
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
              }}
            >
              {destination && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">Destination:</span>
                  <span className="font-mono" style={{ fontWeight: 600 }}>
                    {formatAddress(destination, 6)}
                  </span>
                </div>
              )}

              {amount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">Amount:</span>
                  <span style={{ fontWeight: 600 }}>
                    {amount} {assetCode || 'XLM'}
                  </span>
                </div>
              )}

              {memo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">Memo:</span>
                  <span className="font-mono">{memo}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted">Max Fee:</span>
                <span>{fee}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted">Network:</span>
                <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                  {network}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.4 }}>
              Press both buttons on your Ledger to sign and broadcast the transaction.
            </div>
          </>
        )}

        <button className="btn btn-secondary" onClick={onCancel} style={{ width: '100%' }}>
          {error ? 'Close' : 'Cancel Signing'}
        </button>
      </div>
    </div>
  );
};
