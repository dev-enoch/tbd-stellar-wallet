import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { formatAddress, getExplorerUrl } from '../../services/stellar';
import { MARKET_DATA, CURRENCY_RATES } from '../../services/history';
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

  const market = MARKET_DATA[assetCode] || {
    priceInUsd: 1.0,
    change24h: 0.0,
    sparkline: [1, 1, 1, 1, 1, 1, 1],
  };

  const currencyInfo = CURRENCY_RATES[preferences.currency] || CURRENCY_RATES.USD;
  const priceInFiat = market.priceInUsd * currencyInfo.rateFromUsd;

  // Render SVG Sparkline
  const sparklinePoints = market.sparkline;
  const min = Math.min(...sparklinePoints);
  const max = Math.max(...sparklinePoints);
  const range = max - min || 1;

  const width = 280;
  const height = 70;
  const points = sparklinePoints
    .map((val, idx) => {
      const x = (idx / (sparklinePoints.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 14) - 7;
      return `${x},${y}`;
    })
    .join(' ');

  const isPositive = market.change24h >= 0;

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
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Asset Details</span>
        <div style={{ width: '28px' }} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {/* Top Asset Title & Price */}
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <h2 className="text-xl" style={{ fontWeight: 700 }}>{assetCode}</h2>
            {assetCode !== 'XLM' && (
              <span className="badge badge-accent" style={{ fontSize: '10px' }}>
                <CheckCircle size={10} />
                <span>Verified</span>
              </span>
            )}
          </div>

          <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {currencyInfo.symbol}{priceInFiat.toFixed(priceInFiat < 0.1 ? 4 : 2)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
            <span
              className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              {isPositive ? '+' : ''}{market.change24h.toFixed(2)}% (24h)
            </span>
          </div>
        </div>

        {/* Sparkline Chart */}
        <div
          className="panel"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px 12px',
            marginBottom: '16px',
            background: 'var(--bg-surface)',
          }}
        >
          <svg width={width} height={height} style={{ overflow: 'visible' }}>
            <polyline
              fill="none"
              stroke={isPositive ? 'var(--success)' : 'var(--danger)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>

        {/* Quick Send / Swap Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={() => onSendAsset(assetCode)}>
            <Send size={15} />
            <span>Send {assetCode}</span>
          </button>
          <button className="btn btn-secondary" onClick={() => onSwapAsset(assetCode)}>
            <Repeat size={15} />
            <span>Swap {assetCode}</span>
          </button>
        </div>

        {/* Technical Metadata */}
        <div className="panel-subtle" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Type</span>
            <span>{assetCode === 'XLM' ? 'Stellar Native Token' : 'Credit Alphanum Asset'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Network</span>
            <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>
              {preferences.network}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted">Account</span>
            <span className="font-mono text-xs">{formatAddress(activeAccount?.publicKey || '', 5)}</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <a
          href={getExplorerUrl('account', activeAccount?.publicKey || '', preferences.network)}
          target="_blank"
          rel="noreferrer"
          className="text-tertiary"
          style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <span>View on Stellar.Expert</span>
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  </div>
);
};
