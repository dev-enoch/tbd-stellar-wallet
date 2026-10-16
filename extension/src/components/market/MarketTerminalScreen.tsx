import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { PriceChart } from '../common/PriceChart';
import {
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  Bell,
} from 'lucide-react';

interface MarketPair {
  id: string;
  base: string;
  counter: string;
  price: string;
  change24h: string;
  isPositive: boolean;
  high24h: string;
  low24h: string;
  volume24h: string;
}

const MARKET_PAIRS: MarketPair[] = [
  {
    id: 'xlm-usdc',
    base: 'XLM',
    counter: 'USDC',
    price: '0.1342',
    change24h: '+3.45%',
    isPositive: true,
    high24h: '0.1388',
    low24h: '0.1290',
    volume24h: '$3,842,190',
  },
  {
    id: 'aqua-xlm',
    base: 'AQUA',
    counter: 'XLM',
    price: '0.0078',
    change24h: '-1.12%',
    isPositive: false,
    high24h: '0.0082',
    low24h: '0.0075',
    volume24h: '$840,400',
  },
  {
    id: 'eurc-usdc',
    base: 'EURC',
    counter: 'USDC',
    price: '1.0820',
    change24h: '+0.15%',
    isPositive: true,
    high24h: '1.0850',
    low24h: '1.0790',
    volume24h: '$1,290,000',
  },
  {
    id: 'btc-usdc',
    base: 'BTC',
    counter: 'USDC',
    price: '67,420.00',
    change24h: '+2.80%',
    isPositive: true,
    high24h: '68,100.00',
    low24h: '65,900.00',
    volume24h: '$9,140,500',
  },
];

const MOCK_ORDERBOOK_ASKS = [
  { price: '0.1348', amount: '24,500', total: '3,302.60', depth: 85 },
  { price: '0.1346', amount: '18,200', total: '2,449.72', depth: 68 },
  { price: '0.1345', amount: '42,000', total: '5,649.00', depth: 95 },
  { price: '0.1344', amount: '12,900', total: '1,733.76', depth: 42 },
  { price: '0.1343', amount: '35,100', total: '4,713.93', depth: 78 },
];

const MOCK_ORDERBOOK_BIDS = [
  { price: '0.1341', amount: '31,000', total: '4,157.10', depth: 80 },
  { price: '0.1340', amount: '54,200', total: '7,262.80', depth: 100 },
  { price: '0.1338', amount: '22,400', total: '2,997.12', depth: 55 },
  { price: '0.1335', amount: '16,800', total: '2,242.80', depth: 40 },
  { price: '0.1332', amount: '48,000', total: '6,393.60', depth: 88 },
];

export const MarketTerminalScreen: React.FC = () => {
  const { preferences } = useWallet();
  const [selectedPair, setSelectedPair] = useState<MarketPair>(MARKET_PAIRS[0]);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [notifySubscribed, setNotifySubscribed] = useState(false);

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
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(147, 51, 234, 0.12) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
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
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <CandlestickChart size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                Stellar DEX Pro Terminal
              </h3>
              <span className="badge badge-accent" style={{ fontSize: '10px', fontWeight: 700 }}>
                COMING SOON
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0', lineHeight: 1.4 }}>
              Institutional-grade orderbook, on-chain limit orders, and deep liquidity routing for the Stellar Decentralized Exchange.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setNotifySubscribed(!notifySubscribed)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Bell size={13} color={notifySubscribed ? 'var(--accent)' : 'currentColor'} />
          <span>{notifySubscribed ? 'Alert Active' : 'Notify on Launch'}</span>
        </button>
      </div>

      {/* Market Pair Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        {MARKET_PAIRS.map((pair) => {
          const isSelected = selectedPair.id === pair.id;
          return (
            <div
              key={pair.id}
              onClick={() => setSelectedPair(pair)}
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
                <span style={{ fontWeight: 700, fontSize: '13px' }}>
                  {pair.base}/{pair.counter}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: pair.isPositive ? 'var(--success)' : 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  {pair.isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {pair.change24h}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '16px', fontWeight: 800 }}>${pair.price}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Vol {pair.volume24h}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Terminal Grid: Chart + Orderbook + Order Form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
        }}
      >
        {/* Left: Chart & Statistics */}
        <div
          className="panel"
          style={{
            padding: '20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Pair Metric Ribbon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>
                {selectedPair.base}/{selectedPair.counter}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Stellar SDEX Native Pair
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
              <div>
                <span className="text-muted" style={{ display: 'block', fontSize: '10px' }}>24h High</span>
                <span style={{ fontWeight: 600 }}>${selectedPair.high24h}</span>
              </div>
              <div>
                <span className="text-muted" style={{ display: 'block', fontSize: '10px' }}>24h Low</span>
                <span style={{ fontWeight: 600 }}>${selectedPair.low24h}</span>
              </div>
              <div>
                <span className="text-muted" style={{ display: 'block', fontSize: '10px' }}>24h Volume</span>
                <span style={{ fontWeight: 600 }}>{selectedPair.volume24h}</span>
              </div>
            </div>
          </div>

          {/* SVG Price Chart */}
          <PriceChart
            assetCode={selectedPair.base}
            currency={preferences.currency}
            height={260}
            showTimeframes={true}
            interactive={true}
          />
        </div>

        {/* Right: Orderbook Preview & Trade Panel */}
        <div
          className="panel"
          style={{
            padding: '20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '13px' }}>Orderbook Depth</span>
            <span className="text-muted text-xs">Spread: 0.0002 USDC</span>
          </div>

          {/* Asks (Sells) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', color: 'var(--text-tertiary)', fontSize: '10px', marginBottom: '2px' }}>
              <span>Price</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>
            {MOCK_ORDERBOOK_ASKS.map((ask, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  position: 'relative',
                  padding: '2px 0',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: `${ask.depth}%`,
                    background: 'rgba(239, 68, 68, 0.1)',
                    pointerEvents: 'none',
                  }}
                />
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{ask.price}</span>
                <span style={{ textAlign: 'right' }}>{ask.amount}</span>
                <span style={{ textAlign: 'right', color: 'var(--text-tertiary)' }}>{ask.total}</span>
              </div>
            ))}
          </div>

          {/* Mid Market Price */}
          <div
            style={{
              padding: '6px 0',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            <span style={{ color: 'var(--success)' }}>${selectedPair.price}</span>
            <span className="text-muted" style={{ fontSize: '11px' }}>Last Trade</span>
          </div>

          {/* Bids (Buys) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
            {MOCK_ORDERBOOK_BIDS.map((bid, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  position: 'relative',
                  padding: '2px 0',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: `${bid.depth}%`,
                    background: 'rgba(16, 185, 129, 0.1)',
                    pointerEvents: 'none',
                  }}
                />
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>{bid.price}</span>
                <span style={{ textAlign: 'right' }}>{bid.amount}</span>
                <span style={{ textAlign: 'right', color: 'var(--text-tertiary)' }}>{bid.total}</span>
              </div>
            ))}
          </div>

          {/* Buy/Sell Disabled Action Form */}
          <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setOrderSide('buy')}
                className={`btn btn-sm ${orderSide === 'buy' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Buy {selectedPair.base}
              </button>
              <button
                type="button"
                onClick={() => setOrderSide('sell')}
                className={`btn btn-sm ${orderSide === 'sell' ? 'btn-danger' : 'btn-ghost'}`}
              >
                Sell {selectedPair.base}
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              disabled
              style={{ width: '100%', fontSize: '12px', opacity: 0.6 }}
            >
              Orderbook Placement (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
