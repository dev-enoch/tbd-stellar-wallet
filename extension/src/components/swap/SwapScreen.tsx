import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
import { getSwapQuote, executeSwap, SwapQuote } from '../../services/swaps';
import { getAccountBalances, getExplorerUrl, AccountBalanceSummary } from '../../services/stellar';
import { VERIFIED_ASSETS } from '../../services/trustlines';
import {
  ArrowLeft,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface SwapScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const SwapScreen: React.FC<SwapScreenProps> = ({ onBack, onSuccess }) => {
  const { activeAccount, preferences } = useWallet();
  const { t } = useI18n();

  const [fromCode, setFromCode] = useState('XLM');
  const [toCode, setToCode] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('10');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const countdownIntervalRef = useRef<any>(null);

  // Available token choices
  const availableTokens = [
    { code: 'XLM', name: 'Stellar Lumens', issuer: undefined },
    ...(VERIFIED_ASSETS[preferences.network] || []),
  ];

  const getIssuer = (code: string) => {
    return availableTokens.find((t) => t.code === code)?.issuer;
  };

  // Load balances
  useEffect(() => {
    if (!activeAccount) return;
    getAccountBalances(activeAccount.publicKey, preferences.network).then(setBalances);
  }, [activeAccount, preferences.network]);

  const selectedFromBalance = fromCode === 'XLM'
    ? balances?.spendableXlm || '0.00'
    : balances?.assets.find((a) => a.code === fromCode)?.balance || '0.00';

  // Fetch quote
  const fetchQuote = useCallback(async () => {
    if (!activeAccount) return;
    const amt = parseFloat(fromAmount);
    if (isNaN(amt) || amt <= 0) {
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
        activeAccount.publicKey,
        preferences.network
      );
      setQuote(q);
      setCountdown(30);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch swap quote');
    } finally {
      setIsLoadingQuote(false);
    }
  }, [activeAccount, fromCode, toCode, fromAmount, slippage, preferences.network]);

  // Initial and reactive quote fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  // Countdown timer for quote expiration
  useEffect(() => {
    if (!quote) return;

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchQuote();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [quote, fetchQuote]);

  const handleFlip = () => {
    const temp = fromCode;
    setFromCode(toCode);
    setToCode(temp);
  };

  const handleExecuteSwap = async () => {
    if (!activeAccount || !quote) return;
    setIsSwapping(true);
    setError('');

    try {
      const res = await executeSwap({
        keypair: activeAccount.keypair,
        quote,
        network: preferences.network,
      });

      setTxHash(res.hash);
    } catch (err: any) {
      const msg = err.response?.data?.extras?.result_codes?.transaction || err.message || 'Swap failed';
      setError(`Swap execution error: ${msg}`);
      setIsSwapping(false);
    }
  };

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
        <button className="btn btn-ghost btn-icon" onClick={onBack} disabled={isSwapping} style={{ padding: '4px' }}>
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>{t.swapTitle}</span>
        <div style={{ width: '28px' }} />
      </div>

      {!txHash ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 28px', justifyContent: 'space-between' }}>
          <div>
            <h2 className="text-base" style={{ marginBottom: '12px' }}>{t.swapTitle} Assets</h2>

            {/* Pay Asset Container */}
            <div className="panel" style={{ padding: '12px', marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="text-xs text-muted">{t.payLabel}</span>
                <span className="text-xs text-muted">
                  Balance: <strong>{parseFloat(selectedFromBalance).toLocaleString()} {fromCode}</strong>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px' }}>
                <select
                  className="select"
                  value={fromCode}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === toCode) setToCode(fromCode);
                    setFromCode(next);
                  }}
                >
                  {availableTokens.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  step="any"
                  className="input"
                  style={{ fontSize: '16px', fontWeight: 600 }}
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Flip Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '-10px 0', position: 'relative', zIndex: 10 }}>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={handleFlip}
                style={{
                  borderRadius: 'var(--radius-full)',
                  width: '32px',
                  height: '32px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                }}
                title="Swap assets"
              >
                <ArrowUpDown size={14} />
              </button>
            </div>

            {/* Receive Asset Container */}
            <div className="panel" style={{ padding: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="text-xs text-muted">{t.receiveLabel}</span>
                {quote && (
                  <span className="text-xs text-muted font-mono" style={{ fontSize: '11px' }}>
                    1 {fromCode} ≈ {quote.rate} {toCode}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px' }}>
                <select
                  className="select"
                  value={toCode}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === fromCode) setFromCode(toCode);
                    setToCode(next);
                  }}
                >
                  {availableTokens.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code}
                    </option>
                  ))}
                </select>

                <div
                  className="input"
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-subtle)',
                  }}
                >
                  {isLoadingQuote ? (
                    <span className="text-muted text-xs">Computing best quote…</span>
                  ) : quote ? (
                    <span>~{quote.expectedOutput}</span>
                  ) : (
                    <span className="text-muted">0.00</span>
                  )}
                </div>
              </div>
            </div>

            {/* Missing Trustline Notification */}
            {quote?.needsTrustline && (
              <div className="banner banner-info" style={{ gap: '8px' }}>
                <Sparkles size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '11px' }}>
                  Your account does not have a trustline for <strong>{toCode}</strong> yet. We will automatically opt in and reserve 0.5 XLM as part of this swap.
                </div>
              </div>
            )}

            {/* Price Impact Warning */}
            {quote && quote.priceImpact > 2.0 && (
              <div className="banner banner-warning">
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '11px' }}>
                  {t.lowLiquidityWarn} Price impact is <strong>{quote.priceImpact.toFixed(1)}%</strong>.
                </div>
              </div>
            )}

            {/* Quote details breakdown card */}
            {quote && (
              <div className="panel-subtle" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">{t.minimumReceived}</span>
                  <span style={{ fontWeight: 600 }}>{quote.minimumReceived} {toCode}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">{t.routeSummary}</span>
                  <span className="badge badge-accent" style={{ fontSize: '10px' }}>
                    {quote.route.join(' → ')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">{t.networkFee}</span>
                  <span className="text-muted font-mono">{quote.networkFee} XLM</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid var(--border-muted)' }}>
                  <span className="text-tertiary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <Clock size={11} />
                    <span>Quote updates in {countdown}s</span>
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={fetchQuote}
                    disabled={isLoadingQuote}
                    style={{ padding: '0 4px', fontSize: '11px', color: 'var(--accent)' }}
                  >
                    <RefreshCw size={10} className={isLoadingQuote ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            )}

            {/* Advanced Slippage Control */}
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ width: '100%', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}
              >
                <span>{t.advancedSettings} (Slippage: {slippage}%)</span>
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAdvanced && (
                <div className="panel-subtle" style={{ marginTop: '8px', padding: '10px' }}>
                  <label className="label" style={{ marginBottom: '6px' }}>{t.slippageTolerance}</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[0.5, 1.0, 2.5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`btn btn-sm ${slippage === val ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSlippage(val)}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>

                  {slippage > 1.0 && (
                    <div className="input-hint" style={{ color: 'var(--warning)', marginTop: '6px' }}>
                      {t.highSlippageWarn}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && <div className="input-error-msg" style={{ marginTop: '12px' }}>{error}</div>}
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleExecuteSwap}
            disabled={isSwapping || !quote || parseFloat(fromAmount) <= 0 || parseFloat(fromAmount) > parseFloat(selectedFromBalance)}
            style={{ marginTop: '16px' }}
          >
            {isSwapping ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Executing Swap…</span>
              </>
            ) : quote ? (
              <span>
                {quote.needsTrustline ? 'Opt in & ' : ''}Swap {fromAmount} {fromCode} for ~{quote.expectedOutput} {toCode}
              </span>
            ) : (
              <span>Enter Amount to Swap</span>
            )}
          </button>
        </div>
      ) : (
        /* Swap Result Screen */
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', textAlign: 'center' }}>
          <div style={{ paddingTop: '28px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--success-subtle)',
                color: 'var(--success)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h2 className="text-lg" style={{ marginBottom: '8px' }}>Swap Completed!</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
              Swapped <strong>{fromAmount} {fromCode}</strong> for <strong>~{quote?.expectedOutput} {toCode}</strong>.
            </p>

            <a
              href={getExplorerUrl('tx', txHash, preferences.network)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{t.viewOnExplorer}</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <button className="btn btn-primary btn-lg" onClick={onSuccess}>
            <span>{t.done}</span>
          </button>
        </div>
      )}
    </div>
  );
};
