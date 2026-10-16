import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Asset } from '@stellar/stellar-sdk';
import { useWallet } from '../../contexts/WalletContext';
import { getSwapQuote, executeSwap, SwapQuote } from '../../services/swaps';
import { getAccountBalances, getExplorerUrl, getHorizonServer, AccountBalanceSummary } from '../../services/stellar';
import { VERIFIED_ASSETS } from '../../services/trustlines';
import { getAssetPriceInfo } from '../../services/market';
import { PriceChart } from '../common/PriceChart';
import { SlideToConfirm } from '../common/SlideToConfirm';
import {
  ArrowUpDown,
  Search,
  ChevronDown,
  RefreshCw,
  Clock,
  Sliders,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  BarChart2,
} from 'lucide-react';

interface DesktopSwapProps {
  initialFromAssetCode?: string;
  onSuccess?: () => void;
}

export const DesktopSwap: React.FC<DesktopSwapProps> = ({
  initialFromAssetCode = 'XLM',
  onSuccess,
}) => {
  const { activeAccount, preferences } = useWallet();

  const [fromCode, setFromCode] = useState<string>(initialFromAssetCode);
  const [toCode, setToCode] = useState<string>(initialFromAssetCode === 'USDC' ? 'XLM' : 'USDC');
  const [fromAmount, setFromAmount] = useState<string>('50');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [customSlippage, setCustomSlippage] = useState<string>('');
  const [isCustomSlippage, setIsCustomSlippage] = useState<boolean>(false);

  // Data states
  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [isInvertedRate, setIsInvertedRate] = useState<boolean>(false);

  // Live on-chain SDEX orderbook and stats
  const [orderbook, setOrderbook] = useState<{
    bids: Array<{ price: string; amount: string }>;
    asks: Array<{ price: string; amount: string }>;
    spread: string | null;
  }>({ bids: [], asks: [], spread: null });
  const [pairStats, setPairStats] = useState<{ high: string; low: string; volume: string } | null>(null);

  // Token selector modals
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [pickerSearch, setPickerSearch] = useState<string>('');

  const countdownTimerRef = useRef<any>(null);

  // Available tokens
  const availableTokens = useMemo(() => {
    const list: Array<{ code: string; name: string; issuer?: string }> = [
      { code: 'XLM', name: 'Stellar Lumens', issuer: undefined },
      ...(VERIFIED_ASSETS[preferences.network] || []),
    ];

    if (balances?.assets) {
      balances.assets.forEach((held) => {
        if (!list.some((a) => a.code === held.code && a.issuer === held.issuer)) {
          list.push({
            code: held.code,
            name: `${held.code} Asset`,
            issuer: held.issuer,
          });
        }
      });
    }

    return list;
  }, [preferences.network, balances]);

  const getIssuer = (code: string) => {
    return availableTokens.find((t) => t.code === code)?.issuer;
  };

  // Load balances
  const loadBalances = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const b = await getAccountBalances(activeAccount.publicKey, preferences.network);
      setBalances(b);
    } catch {
      // cache fallback
    }
  }, [activeAccount, preferences.network]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // Fetch live on-chain SDEX orderbook depth and 24h stats
  useEffect(() => {
    let isCancelled = false;
    const fetchSdexData = async () => {
      try {
        const server = getHorizonServer(preferences.network);
        const fromIss = getIssuer(fromCode);
        const toIss = getIssuer(toCode);
        const selling = fromCode === 'XLM' || !fromIss ? Asset.native() : new Asset(fromCode, fromIss);
        const buying = toCode === 'XLM' || !toIss ? Asset.native() : new Asset(toCode, toIss);

        const [ob, agg] = await Promise.all([
          server.orderbook(selling, buying).limit(5).call().catch(() => null),
          server.tradeAggregation(selling, buying, Date.now() - 86400000, Date.now(), 86400000, 0).limit(1).call().catch(() => null),
        ]);

        if (isCancelled) return;

        if (ob) {
          const asks = (ob.asks || []).slice(0, 2).map((a: any) => ({
            price: parseFloat(a.price).toFixed(4),
            amount: `${parseFloat(a.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${fromCode}`,
          }));
          const bids = (ob.bids || []).slice(0, 2).map((b: any) => ({
            price: parseFloat(b.price).toFixed(4),
            amount: `${parseFloat(b.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${fromCode}`,
          }));
          let spreadStr: string | null = null;
          if (asks.length > 0 && bids.length > 0) {
            const spreadVal = Math.abs(parseFloat(asks[0].price) - parseFloat(bids[0].price));
            const spreadPct = (spreadVal / (parseFloat(asks[0].price) || 1)) * 100;
            spreadStr = `Spread: ${spreadVal.toFixed(4)} ${toCode} (${spreadPct.toFixed(2)}%)`;
          }
          setOrderbook({ bids, asks, spread: spreadStr });
        } else {
          setOrderbook({ bids: [], asks: [], spread: null });
        }

        if (agg && agg.records && agg.records.length > 0) {
          const r = agg.records[0];
          setPairStats({
            high: parseFloat(r.high).toFixed(4),
            low: parseFloat(r.low).toFixed(4),
            volume: `$${parseFloat(r.counter_volume).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          });
        } else {
          setPairStats({
            high: '0.0000',
            low: '0.0000',
            volume: '$0.00',
          });
        }
      } catch {
        if (!isCancelled) {
          setOrderbook({ bids: [], asks: [], spread: null });
          setPairStats({ high: '0.0000', low: '0.0000', volume: '$0.00' });
        }
      }
    };

    fetchSdexData();
    return () => {
      isCancelled = true;
    };
  }, [fromCode, toCode, preferences.network, availableTokens]);

  // Selected asset balance
  const selectedFromBalance = useMemo(() => {
    if (fromCode === 'XLM') return balances?.spendableXlm || '0.00';
    const held = balances?.assets.find((a) => a.code === fromCode);
    return held ? held.balance : '0.00';
  }, [fromCode, balances]);

  const selectedToBalance = useMemo(() => {
    if (toCode === 'XLM') return balances?.spendableXlm || '0.00';
    const held = balances?.assets.find((a) => a.code === toCode);
    return held ? held.balance : '0.00';
  }, [toCode, balances]);

  // Fetch Live Swap Quote
  const fetchQuote = useCallback(async () => {
    const parsedAmount = parseFloat(fromAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setQuote(null);
      return;
    }

    setIsLoadingQuote(true);
    setError('');
    try {
      const q = await getSwapQuote(
        fromCode,
        getIssuer(fromCode),
        toCode,
        getIssuer(toCode),
        fromAmount,
        slippage,
        preferences.network
      );
      setQuote(q);
      setCountdown(30);
    } catch (err: any) {
      setError(err.message || 'Could not find DEX liquidity path.');
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [fromCode, toCode, fromAmount, slippage, preferences.network]);

  // Fetch quote when parameters change
  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  // Countdown auto-refresh
  useEffect(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchQuote();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [fetchQuote]);

  // Switch assets
  const handleFlipAssets = () => {
    const oldFrom = fromCode;
    const oldTo = toCode;
    setFromCode(oldTo);
    setToCode(oldFrom);
    if (quote) {
      setFromAmount(quote.expectedOutput);
    }
  };

  // Execute Swap via SlideToConfirm
  const handleExecuteSwap = async () => {
    if (!quote || !activeAccount) return;
    setIsSwapping(true);
    setError('');

    try {
      const res = await executeSwap({
        keypair: activeAccount.keypair,
        quote,
        network: preferences.network,
        signer: activeAccount.signer,
      });

      setTxHash(res.hash);
      await loadBalances();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Swap execution failed.');
    } finally {
      setIsSwapping(false);
    }
  };

  // USD Price Calculations
  const fromPriceUsd = getAssetPriceInfo(fromCode).priceInUsd;
  const toPriceUsd = getAssetPriceInfo(toCode).priceInUsd;
  const fromFiatTotal = (parseFloat(fromAmount || '0') * fromPriceUsd).toFixed(2);
  const toFiatTotal = quote ? (parseFloat(quote.expectedOutput) * toPriceUsd).toFixed(2) : '0.00';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Stellar DEX Decentralized Swap
          </h2>
          <p className="text-muted" style={{ margin: 0, fontSize: '12.5px' }}>
            Native orderbook routing & path payment engine on Stellar {preferences.network.toUpperCase()}.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <Clock size={12} />
            <span>Refreshes in {countdown}s</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={fetchQuote}
            disabled={isLoadingQuote}
            title="Refresh Price Quote"
            style={{ width: '32px', height: '32px' }}
          >
            <RefreshCw size={14} className={isLoadingQuote ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr', gap: '24px', alignItems: 'start' }}>
        {/* =========================================================================
            LEFT COLUMN: MODERN SWAP TERMINAL
            ========================================================================= */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Success Overlay if Completed */}
          {txHash ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 12px', gap: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={30} color="var(--success)" />
              </div>

              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px' }}>Swap Executed Successfully!</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
                  Swapped {fromAmount} {fromCode} for ≈ {quote?.expectedOutput} {toCode}.
                </p>
              </div>

              <a
                href={getExplorerUrl('tx', txHash, preferences.network)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ gap: '6px', fontSize: '12px' }}
              >
                <span>View on StellarExpert</span>
                <ExternalLink size={13} />
              </a>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setTxHash('');
                  setFromAmount('50');
                  fetchQuote();
                }}
                style={{ width: '100%', marginTop: '8px' }}
              >
                Make Another Trade
              </button>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Box 1: You Pay */}
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    You Pay
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Available:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{parseFloat(selectedFromBalance).toLocaleString()} {fromCode}</strong>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setFromAmount(selectedFromBalance)}
                      style={{ padding: '1px 5px', fontSize: '10px', fontWeight: 700, color: 'var(--accent)' }}
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <input
                    type="number"
                    className="input font-mono"
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    style={{ fontSize: '24px', fontWeight: 800, border: 'none', background: 'transparent', padding: 0 }}
                  />

                  {/* Token Button */}
                  <button
                    type="button"
                    onClick={() => setPickerTarget('from')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 800,
                      }}
                    >
                      {fromCode.substring(0, 3)}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{fromCode}</span>
                    <ChevronDown size={14} color="var(--text-tertiary)" />
                  </button>
                </div>

                <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                  ≈ ${fromFiatTotal} USD
                </div>
              </div>

              {/* Flip Button */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0' }}>
                <button
                  type="button"
                  onClick={handleFlipAssets}
                  title="Switch Sell and Buy Assets"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(180deg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(0deg)')}
                >
                  <ArrowUpDown size={15} />
                </button>
              </div>

              {/* Box 2: You Receive */}
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    You Receive (Estimated)
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Holding:</span>{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{parseFloat(selectedToBalance).toLocaleString()} {toCode}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: quote ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {isLoadingQuote ? 'Calculating…' : quote ? parseFloat(quote.expectedOutput).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0.0'}
                  </div>

                  {/* Token Button */}
                  <button
                    type="button"
                    onClick={() => setPickerTarget('to')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--success)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 800,
                      }}
                    >
                      {toCode.substring(0, 3)}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{toCode}</span>
                    <ChevronDown size={14} color="var(--text-tertiary)" />
                  </button>
                </div>

                <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                  ≈ ${toFiatTotal} USD
                </div>
              </div>

              {/* Slippage Tolerance Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <Sliders size={13} />
                  <span>Max Slippage:</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {[0.1, 0.5, 1.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setSlippage(val);
                        setIsCustomSlippage(false);
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: !isCustomSlippage && slippage === val ? 700 : 500,
                        border: !isCustomSlippage && slippage === val ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                        background: !isCustomSlippage && slippage === val ? 'var(--bg-subtle)' : 'transparent',
                        color: !isCustomSlippage && slippage === val ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {val}%
                    </button>
                  ))}
                  <div style={{ position: 'relative', width: '60px' }}>
                    <input
                      type="number"
                      placeholder="Custom"
                      className="input"
                      value={customSlippage}
                      onChange={(e) => {
                        setCustomSlippage(e.target.value);
                        setIsCustomSlippage(true);
                        const num = parseFloat(e.target.value);
                        if (!isNaN(num) && num > 0) setSlippage(num);
                      }}
                      style={{ padding: '2px 4px', fontSize: '11px', height: '26px', textAlign: 'center' }}
                    />
                  </div>
                </div>
              </div>

              {/* Execution Details Panel */}
              {quote && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '11.5px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-secondary">Exchange Rate</span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setIsInvertedRate(!isInvertedRate)}
                      style={{ padding: '2px 6px', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}
                    >
                      {isInvertedRate
                        ? `1 ${toCode} ≈ ${(parseFloat(quote.sendAmount) / parseFloat(quote.expectedOutput)).toFixed(4)} ${fromCode}`
                        : `1 ${fromCode} ≈ ${(parseFloat(quote.expectedOutput) / parseFloat(quote.sendAmount)).toFixed(4)} ${toCode}`}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Minimum Received</span>
                    <span style={{ fontWeight: 600 }}>{parseFloat(quote.minimumReceived).toLocaleString(undefined, { maximumFractionDigits: 6 })} {toCode}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Price Impact</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{quote.priceImpact || '< 0.05%'} (Low)</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Network Routing</span>
                    <span style={{ fontWeight: 600 }}>{quote.route?.length ? `${quote.route.length} Hops SDEX Path` : 'Direct SDEX Orderbook'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-secondary">Network Fee</span>
                    <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      {activeAccount?.type === 'passkey' ? 'Sponsored (Free)' : '0.00001 XLM'}
                    </span>
                  </div>
                </div>
              )}

              {/* Slide to Confirm Swap */}
              <div style={{ marginTop: '6px' }}>
                <SlideToConfirm
                  onConfirm={handleExecuteSwap}
                  label="Slide to Execute Swap"
                  loadingLabel="Submitting Swap Order..."
                  disabled={!quote || isSwapping || parseFloat(fromAmount || '0') <= 0}
                  isLoading={isSwapping}
                />
              </div>
            </>
          )}
        </div>

        {/* =========================================================================
            RIGHT COLUMN: PAIR ANALYTICS & MARKET DEPTH
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Pair Price Chart */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{fromCode} / {toCode}</span>
                  <span className="badge badge-accent" style={{ fontSize: '10px' }}>SDEX Pair</span>
                </div>
                <div className="text-tertiary" style={{ fontSize: '11px', marginTop: '2px' }}>
                  Real-time market depth and historical candlestick curve
                </div>
              </div>
            </div>

            <PriceChart
              assetCode={fromCode}
              currency={preferences.currency}
              height={220}
              showTimeframes={true}
              interactive={true}
            />
          </div>

          {/* Pair Metrics & Orderbook Depth */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* 24h Metrics */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                <TrendingUp size={14} color="var(--accent)" />
                <span>24h On-Chain Statistics</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-secondary">24h High</span>
                  <span style={{ fontWeight: 600 }}>
                    {pairStats && pairStats.high !== '0.0000' ? `$${pairStats.high}` : 'Not found'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-secondary">24h Low</span>
                  <span style={{ fontWeight: 600 }}>
                    {pairStats && pairStats.low !== '0.0000' ? `$${pairStats.low}` : 'Not found'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-secondary">24h SDEX Volume</span>
                  <span style={{ fontWeight: 600 }}>
                    {pairStats ? pairStats.volume : '$0.00'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-secondary">Settlement Time</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>≈ 3.8s Ledger Consensus</span>
                </div>
              </div>
            </div>

            {/* Orderbook Depth Preview */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                <BarChart2 size={14} color="var(--success)" />
                <span>Live SDEX Orderbook Depth</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                {orderbook.asks.length === 0 && orderbook.bids.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 8px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                    <span>No active orderbook orders found on SDEX</span>
                    <div style={{ fontSize: '10px', marginTop: '2px', color: 'var(--text-muted)' }}>Depth: 0 • Default: 0</div>
                  </div>
                ) : (
                  <>
                    {/* Asks */}
                    {orderbook.asks.map((ask, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{ask.price}</span>
                        <span className="text-muted">{ask.amount}</span>
                        <div style={{ width: '40px', height: '4px', background: 'var(--danger)', opacity: 0.6, borderRadius: '2px' }} />
                      </div>
                    ))}

                    {/* Spread */}
                    {orderbook.spread && (
                      <div style={{ textAlign: 'center', padding: '2px 0', borderTop: '1px dashed var(--border-subtle)', borderBottom: '1px dashed var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '10px' }}>
                        {orderbook.spread}
                      </div>
                    )}

                    {/* Bids */}
                    {orderbook.bids.map((bid, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>{bid.price}</span>
                        <span className="text-muted">{bid.amount}</span>
                        <div style={{ width: '55px', height: '4px', background: 'var(--success)', opacity: 0.8, borderRadius: '2px' }} />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Token Selector Modal */}
      {pickerTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPickerTarget(null)}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              padding: '20px',
              width: '100%',
              maxWidth: '440px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Select an Asset</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setPickerTarget(null)}>
                ✕
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search token name or code..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                style={{ paddingLeft: '32px', height: '34px', fontSize: '12px' }}
                autoFocus
              />
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {availableTokens
                .filter((t) => t.code.toLowerCase().includes(pickerSearch.toLowerCase()) || t.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                .map((token) => (
                  <div
                    key={token.code}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      if (pickerTarget === 'from') {
                        setFromCode(token.code);
                        if (token.code === toCode) setToCode(fromCode);
                      } else {
                        setToCode(token.code);
                        if (token.code === fromCode) setFromCode(toCode);
                      }
                      setPickerTarget(null);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-focus)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '11px',
                        }}
                      >
                        {token.code.substring(0, 3)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{token.code}</div>
                        <div className="text-tertiary" style={{ fontSize: '11px' }}>{token.name}</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
