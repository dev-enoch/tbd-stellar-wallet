import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { formatAddress } from '../../services/stellar';
import { Shield, Globe, Check } from 'lucide-react';

interface ConnectRequestModalProps {
  origin: string;
  onApprove: (selectedPublicKey: string) => void;
  onReject: () => void;
}

export const ConnectRequestModal: React.FC<ConnectRequestModalProps> = ({
  origin,
  onApprove,
  onReject,
}) => {
  const { accounts, activeAccountIndex, switchAccount } = useWallet();
  const activeAccount = accounts[activeAccountIndex];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-primary)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 20px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700 }}>Connection Request</span>
        </div>

        {/* Origin Hero Card */}
        <div
          className="panel"
          style={{
            textAlign: 'center',
            padding: '20px 16px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Globe size={20} color="var(--accent)" />
          </div>

          <h3 style={{ fontSize: '17px', fontWeight: 700, wordBreak: 'break-all' }}>{origin}</h3>
          <span className="text-xs text-muted">wants to connect to your wallet</span>
        </div>

        {/* Permissions list */}
        <div className="panel-subtle" style={{ marginBottom: '20px' }}>
          <div className="label" style={{ marginBottom: '8px' }}>Requested Permissions:</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} color="var(--success)" />
              <span>View your account address and balances</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} color="var(--success)" />
              <span>Request transaction signing approval (you confirm each one)</span>
            </li>
          </ul>
        </div>

        {/* Account to share selector */}
        <div className="form-group">
          <label className="label">Account to connect</label>
          <select
            className="select"
            value={activeAccountIndex}
            onChange={(e) => switchAccount(parseInt(e.target.value, 10))}
          >
            {accounts.map((acc, idx) => (
              <option key={acc.publicKey} value={idx}>
                {acc.name} ({formatAddress(acc.publicKey, 4)})
              </option>
            ))}
          </select>
        </div>

        <div className="banner banner-info" style={{ marginTop: '12px', gap: '8px' }}>
          <Shield size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent)' }} />
          <div style={{ fontSize: '11px' }}>
            The website will never have access to your private keys or recovery phrase.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button className="btn btn-secondary btn-lg" onClick={onReject}>
          Reject
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => onApprove(activeAccount?.publicKey || '')}
        >
          Approve
        </button>
      </div>
    </div>
  );
};
