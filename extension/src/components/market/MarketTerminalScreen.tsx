import React, { useState, useEffect } from 'react';
import { Asset } from '@stellar/stellar-sdk';
import { useWallet } from '../../contexts/WalletContext';
import { getHorizonServer } from '../../services/stellar';
import { getAssetPriceInfo, fetchLiveMarketPrices } from '../../services/market';
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
  baseIssuer?: string;
  counter: string;
  counterIssuer?: string;
  price: string;
  change24h: string;
  isPositive: boolean;
  high24h: string;
  low24h: string;
  volume24h: string;
}

const DEFAULT_PAIRS: MarketPair[] = [
  {
    id: 'xlm-usdc',
    base: 'XLM',
    counter: 'USDC',
    price: '0.00',
    change24h: '0.00%',
    isPositive: true,
    high24h: '0.00',
    low24h: '0.00',
    volume24h: '$0.00',
  },
  {
    id: 'aqua-xlm',
    base: 'AQUA',
    counter: 'XLM',
    price: '0.00',
    change24h: '0.00%',
    isPositive: true,
    high24h: '0.00',
    low24h: '0.00',
    volume24h: '$0.00',
  },
  {
    id: 'eurc-usdc',
    base: 'EURC',
    counter: 'USDC',
    price: '0.00',
    change24h: '0.00%',
    isPositive: true,
    high24h: '0.00',
    low24h: '0.00',
    volume24h: '$0.00',
  },
  {
    id: 'btc-usdc',
    base: 'BTC',
    counter: 'USDC',
    price: '0.00',
    change24h: '0.00%',
    isPositive: true,
    high24h: '0.00',
    low24h: '0.00',
    volume24h: '$0.00',
  },
];

export const MarketTerminalScreen: React.FC = () => {
  const { preferences } = useWallet();
  const [pairs, setPairs] = useState<MarketPair[]>(DEFAULT_PAIRS);
  const [selectedPair, setSelectedPair] = useState<MarketPair>(DEFAULT_PAIRS[0]);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [notifySubscribed, setNotifySubscribed] = useState(false);

  const [orderbook, setOrderbook] = useState<{
    asks: Array<{ price: string; amount: string; total: string; depth: number }>;
    bids: Array<{ price: string; amount: string; total: string; depth: number }>;
    spread: string;
  }>({ asks: [], bids: [], spread: '0.00' });

  // Fetch live SDEX orderbook and market pair quotes
  useEffect(() => {
    let cancelled = false;

    const loadMarketData = async () => {
      try {
        const livePrices = await fetchLiveMarketPrices();
        if (cancelled) return;

        setPairs((prev) =>
          prev.map((p) => {
            const info = livePrices[p.base] || getAssetPriceInfo(p.base);
            const priceVal = info?.priceInUsd || 0;
            const changeVal = info?.change24h || 0;
            return {
              ...p,
              price: priceVal > 0 ? priceVal.toFixed(4) : '0.00',
              change24h: `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(2)}%`,
              isPositive: changeVal >= 0,
            };
          })
        );

        const server = getHorizonServer(preferences.network);
        const usdcIssuer = preferences.network === 'mainnet'
          ? 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
          : 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

        const baseAsset = selectedPair.base === 'XLM' ? Asset.native() : new Asset(selectedPair.base, selectedPair.baseIssuer || usdcIssuer);
        const counterAsset = selectedPair.counter === 'XLM' ? Asset.native() : new Asset(selectedPair.counter, selectedPair.counterIssuer || usdcIssuer);

        const [ob, agg] = await Promise.all([
          server.orderbook(baseAsset, counterAsset).limit(5).call().catch(() => null),
          server.tradeAggregation(baseAsset, counterAsset, Date.now() - 86400000, Date.now(), 86400000, 0).limit(1).call().catch(() => null),
        ]);

        if (cancelled) return;

        if (ob) {
          const asks = (ob.asks || []).map((a: any) => {
            const priceNum = parseFloat(a.price);
            const amtNum = parseFloat(a.amount);
            return {
              price: priceNum.toFixed(4),
              amount: amtNum.toLocaleString(undefined, { maximumFractionDigits: 0 }),
              total: (priceNum * amtNum).toLocaleString(undefined, { maximumFractionDigits: 2 }),
              depth: Math.min(100, Math.max(15, Math.round((amtNum / 1000) * 10))),
            };
          });

          const bids = (ob.bids || []).map((b: any) => {
            const priceNum = parseFloat(b.price);
            const amtNum = parseFloat(b.amount);
            return {
              price: priceNum.toFixed(4),
              amount: amtNum.toLocaleString(undefined, { maximumFractionDigits: 0 }),
              total: (priceNum * amtNum).toLocaleString(undefined, { maximumFractionDigits: 2 }),
              depth: Math.min(100, Math.max(15, Math.round((amtNum / 1000) * 10))),
            };
          });

          let spread = '0.00';
          if (asks.length > 0 && bids.length > 0) {
            spread = `${Math.abs(parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(4)} ${selectedPair.counter}`;
          }

          setOrderbook({ asks, bids, spread });
        } else {
          setOrderbook({ asks: [], bids: [], spread: '0.00' });
        }

        if (agg && agg.records && agg.records.length > 0) {
          const r = agg.records[0];
          setSelectedPair((curr) => ({
            ...curr,
            high24h: parseFloat(r.high).toFixed(4),
            low24h: parseFloat(r.low).toFixed(4),
            volume24h: `$${parseFloat(r.counter_volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          }));
        } else {
          setSelectedPair((curr) => ({
            ...curr,
            high24h: '0.00',
            low24h: '0.00',
            volume24h: '$0.00',
          }));
        }
      } catch {
        if (!cancelled) {
          setOrderbook({ asks: [], bids: [], spread: '0.00' });
        }
      }
    };

    loadMarketData();
    return () => {
      cancelled = true;
    };
  }, [selectedPair.id, preferences.network]);

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
        {pairs.map((pair) => {
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
            <span className="text-muted text-xs">Spread: {orderbook.spread}</span>
          </div>

          {orderbook.asks.length === 0 && orderbook.bids.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 8px', color: 'var(--text-tertiary)', fontSize: '11.5px' }}>
              <span>No open orders found on SDEX for this pair</span>
              <div style={{ fontSize: '10.5px', marginTop: '4px', color: 'var(--text-muted)' }}>Depth: 0 • Defaults to 0</div>
            </div>
          ) : (
            <>
              {/* Asks (Sells) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', color: 'var(--text-tertiary)', fontSize: '10px', marginBottom: '2px' }}>
                  <span>Price</span>
                  <span style={{ textAlign: 'right' }}>Amount</span>
                  <span style={{ textAlign: 'right' }}>Total</span>
                </div>
                {orderbook.asks.map((ask, idx) => (
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
                {orderbook.bids.map((bid, idx) => (
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
            </>
          )}

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
