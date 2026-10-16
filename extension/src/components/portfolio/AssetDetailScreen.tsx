import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { formatAddress, getExplorerUrl } from '../../services/stellar';
import { PriceChart } from '../common/PriceChart';
import {
  ArrowLeft,
  Send,
  Repeat,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

interface AssetDetailScreenProps {
  assetCode: string;
  onBack: () => void;
  onSendAsset: (code: string) => void;
  onSwapAsset: (code: string) => void;
}

export const AssetDetailScreen: React.FC<AssetDetailScreenProps> = ({
  assetCode,
  onBack,
  onSendAsset,
  onSwapAsset,
}) => {
  const { preferences, activeAccount } = useWallet();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header - Compact */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}
      >
        <button className="btn btn-ghost btn-icon" onClick={onBack} style={{ padding: '4px' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>{assetCode} Details</span>
          {assetCode !== 'XLM' && (
            <span className="badge badge-accent" style={{ fontSize: '10px' }}>
              <CheckCircle size={10} />
              <span>Verified</span>
            </span>
          )}
        </div>
        <div style={{ width: '28px' }} />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Real Live Interactive Price Chart */}
        <div
          className="panel"
          style={{
            padding: '16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <PriceChart
            assetCode={assetCode}
            currency={preferences.currency}
            height={140}
            showTimeframes={true}
            interactive={true}
          />
        </div>

        {/* Quick Send / Swap Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            className="btn btn-primary"
            onClick={() => onSendAsset(assetCode)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Send size={15} />
            <span>Send {assetCode}</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onSwapAsset(assetCode)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Repeat size={15} />
            <span>Swap {assetCode}</span>
          </button>
        </div>

        {/* Technical Metadata */}
        <div
          className="panel-subtle"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '12px',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Type</span>
            <span style={{ fontWeight: 600 }}>
              {assetCode === 'XLM' ? 'Stellar Native Token' : 'Credit Alphanum Asset'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Network</span>
            <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>
              {preferences.network}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Account Holder</span>
            <span className="font-mono">{formatAddress(activeAccount?.publicKey || '', 4)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '8px',
            }}
          >
            <span className="text-muted">StellarExpert Explorer</span>
            <a
              href={getExplorerUrl('account', activeAccount?.publicKey || '', preferences.network)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <span>Ledger Page</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
