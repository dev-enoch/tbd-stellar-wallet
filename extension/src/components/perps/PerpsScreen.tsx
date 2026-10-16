import React, { useState, useEffect } from 'react';
import { getAssetPriceInfo, fetchLiveMarketPrices } from '../../services/market';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

interface PerpMarket {
  symbol: string;
  assetCode: string;
  underlying: string;
  price: string;
  markPrice: string;
  fundingRate: string;
  volume24h: string;
  openInterest: string;
  isPositive: boolean;
}

const INITIAL_MARKETS: PerpMarket[] = [
  {
    symbol: 'XLM-PERP',
    assetCode: 'XLM',
    underlying: 'Stellar Lumens',
    price: '0.00',
    markPrice: '0.00',
    fundingRate: '0.0000% / 8h',
    volume24h: '$0.00',
    openInterest: '$0.00',
    isPositive: true,
  },
  {
    symbol: 'BTC-PERP',
    assetCode: 'BTC',
    underlying: 'Bitcoin',
    price: '0.00',
    markPrice: '0.00',
    fundingRate: '0.0000% / 8h',
    volume24h: '$0.00',
    openInterest: '$0.00',
    isPositive: true,
  },
  {
    symbol: 'ETH-PERP',
    assetCode: 'ETH',
    underlying: 'Ethereum',
    price: '0.00',
    markPrice: '0.00',
    fundingRate: '0.0000% / 8h',
    volume24h: '$0.00',
    openInterest: '$0.00',
    isPositive: true,
  },
  {
    symbol: 'AQUA-PERP',
    assetCode: 'AQUA',
    underlying: 'Aquarius',
    price: '0.00',
    markPrice: '0.00',
    fundingRate: '0.0000% / 8h',
    volume24h: '$0.00',
    openInterest: '$0.00',
    isPositive: true,
  },
];

export const PerpsScreen: React.FC = () => {
  const [markets, setMarkets] = useState<PerpMarket[]>(INITIAL_MARKETS);
  const [selectedMarket, setSelectedMarket] = useState<PerpMarket>(INITIAL_MARKETS[0]);
  const [positionSide, setPositionSide] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState<number>(5);
  const [collateralAmount, setCollateralAmount] = useState<string>('100');

  useEffect(() => {
    let cancelled = false;
    fetchLiveMarketPrices().then((prices) => {
      if (cancelled) return;
      setMarkets((prev) =>
        prev.map((m) => {
          const info = prices[m.assetCode] || getAssetPriceInfo(m.assetCode);
          const priceVal = info?.priceInUsd || 0;
          const formatted = priceVal > 0 ? priceVal.toFixed(4) : '0.00';
          return {
            ...m,
            price: formatted,
            markPrice: formatted,
            isPositive: (info?.change24h || 0) >= 0,
          };
        })
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const collateralNum = parseFloat(collateralAmount) || 0;
  const positionValue = collateralNum * leverage;
  const estEntryPrice = parseFloat(selectedMarket.price);
  const liquidationPrice =
    positionSide === 'long'
      ? (estEntryPrice * (1 - 1 / leverage * 0.9)).toFixed(4)
      : (estEntryPrice * (1 + 1 / leverage * 0.9)).toFixed(4);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        background: 'var(--bg-primary)',
        padding: '24px 28px',
        gap: '20px',
      }}
    >
      {/* Top Banner: Coming Soon Announcement */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.12) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                Stellar Soroban Perpetuals (Perps)
              </h3>
              <span className="badge badge-warning" style={{ fontSize: '10px', fontWeight: 700 }}>
                COMING SOON
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0', lineHeight: 1.4 }}>
              Decentralized, non-custodial perpetual futures powered by Soroban smart contracts. Trade up to 20x leverage with instant on-chain settlement.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge" style={{ fontSize: '11px', padding: '4px 8px' }}>
            Auditing Soroban Contracts
          </span>
        </div>
      </div>

      {/* Market Selector Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {markets.map((market) => {
          const isSelected = selectedMarket.symbol === market.symbol;
          return (
            <div
              key={market.symbol}
              onClick={() => setSelectedMarket(market)}
              style={{
                padding: '14px 16px',
                background: isSelected ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>{market.symbol}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: market.isPositive ? 'var(--success)' : 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  {market.isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {market.fundingRate}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '17px', fontWeight: 800 }}>${market.price}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>OI {market.openInterest}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Terminal Layout: Market Stats & Position Form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.8fr 1.2fr',
          gap: '20px',
        }}
      >
        {/* Left: Position Mechanics & Architecture Overview */}
        <div
          className="panel"
          style={{
            padding: '24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px' }}>
                {selectedMarket.symbol} Specification
              </h3>
              <span className="text-muted text-xs">{selectedMarket.underlying} Perpetual Contract</span>
            </div>
            <span className="badge badge-accent" style={{ fontSize: '11px' }}>
              Soroban Engine v2
            </span>
          </div>

          {/* Metric Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              padding: '16px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <span className="text-muted text-xs" style={{ display: 'block', marginBottom: '2px' }}>Index Price</span>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>${selectedMarket.price}</span>
            </div>
            <div>
              <span className="text-muted text-xs" style={{ display: 'block', marginBottom: '2px' }}>Mark Price</span>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>${selectedMarket.markPrice}</span>
            </div>
            <div>
              <span className="text-muted text-xs" style={{ display: 'block', marginBottom: '2px' }}>8h Funding Rate</span>
              <span style={{ fontWeight: 700, fontSize: '14px', color: selectedMarket.isPositive ? 'var(--success)' : 'var(--danger)' }}>
                {selectedMarket.fundingRate}
              </span>
            </div>
            <div>
              <span className="text-muted text-xs" style={{ display: 'block', marginBottom: '2px' }}>24h Volume</span>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>{selectedMarket.volume24h}</span>
            </div>
            <div>
              <span className="text-muted text-xs" style={{ display: 'block', marginBottom: '2px' }}>Open Interest</span>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>{selectedMarket.openInterest}</span>
            </div>
            <div>
              <span className="text-muted text-xs" style={{ display: 'block', marginBottom: '2px' }}>Max Leverage</span>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent)' }}>20x</span>
            </div>
          </div>

          {/* Feature Highlight List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <ShieldCheck size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px' }}>
                <strong>Non-Custodial Vaults:</strong> Collateral stays locked in Soroban smart contracts directly verified on Stellar ledgers.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Zap size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px' }}>
                <strong>Sub-Second Execution:</strong> Stellar’s 4-second finality enables high-frequency position adjustments without reorg risks.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Sliders size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px' }}>
                <strong>Oracle Price Protection:</strong> Aggregated multi-anchor feed prevents malicious flash-loan liquidations.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Order Form Preview */}
        <div
          className="panel"
          style={{
            padding: '24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Long / Short Switch */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--bg-subtle)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setPositionSide('long')}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                background: positionSide === 'long' ? 'var(--success)' : 'transparent',
                color: positionSide === 'long' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              Long
            </button>
            <button
              type="button"
              onClick={() => setPositionSide('short')}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                background: positionSide === 'short' ? 'var(--danger)' : 'transparent',
                color: positionSide === 'short' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              Short
            </button>
          </div>

          {/* Leverage Selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="label" style={{ margin: 0 }}>Leverage</span>
              <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--accent)' }}>{leverage}x</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {[1, 2, 5, 10, 20].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLeverage(lvl)}
                  style={{
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: leverage === lvl ? 700 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: leverage === lvl ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    background: leverage === lvl ? 'var(--accent)' : 'var(--bg-subtle)',
                    color: leverage === lvl ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {lvl}x
                </button>
              ))}
            </div>
          </div>

          {/* Collateral Input */}
          <div className="form-group">
            <label className="label">Collateral (USDC)</label>
            <input
              type="number"
              className="input"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
              placeholder="100.00"
              style={{ fontSize: '14px', fontWeight: 600 }}
            />
          </div>

          {/* Position Summary Card */}
          <div
            style={{
              padding: '12px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Total Position Size:</span>
              <span style={{ fontWeight: 700 }}>${positionValue.toFixed(2)} USDC</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Est. Entry Price:</span>
              <span style={{ fontWeight: 600 }}>${selectedMarket.price}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Est. Liquidation Price:</span>
              <span style={{ fontWeight: 700, color: 'var(--danger)' }}>${liquidationPrice}</span>
            </div>
          </div>

          {/* Disabled Action */}
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            disabled
            style={{ width: '100%', marginTop: 'auto', opacity: 0.6 }}
          >
            Perpetuals Beta (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
};
