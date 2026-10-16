import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { getSwapQuote, executeSwap, SwapQuote } from '../../services/swaps';
import { getAccountBalances, getExplorerUrl, AccountBalanceSummary } from '../../services/stellar';
import { VERIFIED_ASSETS } from '../../services/trustlines';
import { getAssetPriceInfo } from '../../services/market';
import { CURRENCY_RATES } from '../../services/history';
import {
  ArrowLeft,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Clock,
  RefreshCw,
  Loader2,
  Sparkles,
  Sliders,
  ShieldAlert,
  Search,
  X,
  Repeat,
} from 'lucide-react';
import { scanTransaction, ScanResult } from '../../services/scanning';

interface SwapScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  initialFromAssetCode?: string;
}

export const SwapScreen: React.FC<SwapScreenProps> = ({
  onBack,
  onSuccess,
  initialFromAssetCode = 'XLM',
}) => {
  const { activeAccount, preferences } = useWallet();

  const [fromCode, setFromCode] = useState<string>(initialFromAssetCode);
  const [toCode, setToCode] = useState<string>(initialFromAssetCode === 'USDC' ? 'XLM' : 'USDC');
  const [fromAmount, setFromAmount] = useState<string>('10');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showSlippageModal, setShowSlippageModal] = useState<boolean>(false);
  const [customSlippage, setCustomSlippage] = useState<string>('');

  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  // Rate invert toggle
  const [isInvertedRate, setIsInvertedRate] = useState<boolean>(false);

  // Token modal picker
  const [tokenPickerTarget, setTokenPickerTarget] = useState<'from' | 'to' | null>(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState<string>('');

  // Threat Scanning States (PRD Section 4)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const countdownIntervalRef = useRef<any>(null);

  // Available token choices combining verified list + any user held trustlines
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
  useEffect(() => {
    if (!activeAccount) return;
    getAccountBalances(activeAccount.publicKey, preferences.network).then(setBalances);
  }, [activeAccount, preferences.network]);

  const selectedFromBalance = useMemo(() => {
    if (fromCode === 'XLM') return balances?.spendableXlm || '0.00';
    return balances?.assets.find((a) => a.code === fromCode)?.balance || '0.00';
  }, [fromCode, balances]);

  const selectedToBalance = useMemo(() => {
    if (toCode === 'XLM') return balances?.spendableXlm || '0.00';
    return balances?.assets.find((a) => a.code === toCode)?.balance || '0.00';
  }, [toCode, balances]);

  // Currency values
  const currencyInfo = CURRENCY_RATES[preferences.currency] || CURRENCY_RATES.USD;
  const fromPriceUsd = getAssetPriceInfo(fromCode).priceInUsd;
  const fromPriceFiat = fromPriceUsd * currencyInfo.rateFromUsd;
  const fromFiatVal = useMemo(() => {
    const amt = parseFloat(fromAmount) || 0;
    const total = amt * fromPriceFiat;
    return `${currencyInfo.symbol}${total.toFixed(total < 0.1 ? 4 : 2)}`;
  }, [fromAmount, fromPriceFiat, currencyInfo]);

  const toPriceUsd = getAssetPriceInfo(toCode).priceInUsd;
  const toPriceFiat = toPriceUsd * currencyInfo.rateFromUsd;
  const toFiatVal = useMemo(() => {
    if (!quote?.expectedOutput) return `${currencyInfo.symbol}0.00`;
    const amt = parseFloat(quote.expectedOutput) || 0;
    const total = amt * toPriceFiat;
    return `${currencyInfo.symbol}${total.toFixed(total < 0.1 ? 4 : 2)}`;
  }, [quote, toPriceFiat, currencyInfo]);

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
      setError(err.message || 'No DEX orderbook liquidity route found for this pair.');
    } finally {
      setIsLoadingQuote(false);
    }
  }, [activeAccount, fromCode, toCode, fromAmount, slippage, preferences.network]);

  // Trigger quote fetching with debounce
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

  // Scan destination asset for threats
  useEffect(() => {
    if (quote && activeAccount) {
      let isCancelled = false;
      scanTransaction({
        assetCode: toCode,
        assetIssuer: quote.toAssetIssuer,
        amount: quote.sendAmount,
        priceImpact: quote.priceImpact,
        enabled: preferences.threatScanningEnabled,
      }).then((res) => {
        if (!isCancelled) {
          setScanResult(res);
        }
      });
      return () => {
        isCancelled = true;
      };
    } else {
      setScanResult(null);
    }
  }, [quote, toCode, preferences.threatScanningEnabled, activeAccount]);

  // Flip from and to tokens
  const handleFlip = () => {
    const temp = fromCode;
    setFromCode(toCode);
    setToCode(temp);
    if (quote?.expectedOutput) {
      setFromAmount(quote.expectedOutput);
    }
  };

  // Quick balance buttons
  const handleSetMax = () => {
    const max = parseFloat(selectedFromBalance);
    if (isNaN(max) || max <= 0) return;
    if (fromCode === 'XLM') {
      const safe = Math.max(0, max - 0.0001);
      setFromAmount(safe.toFixed(4));
    } else {
      setFromAmount(max.toString());
    }
  };

  const handleSetHalf = () => {
    const max = parseFloat(selectedFromBalance);
    if (isNaN(max) || max <= 0) return;
    const half = (max / 2).toFixed(4);
    setFromAmount(half);
  };

  // Execute Swap
  const handleExecuteSwap = async () => {
    if (!activeAccount || !quote) return;
    setIsSwapping(true);
    setError('');

    try {
      const res = await executeSwap({
        keypair: activeAccount.keypair,
        signer: activeAccount.signer,
        quote,
        network: preferences.network,
      });

      setTxHash(res.hash);
    } catch (err: any) {
      const msg =
        err.response?.data?.extras?.result_codes?.transaction ||
        err.message ||
        'Swap transaction execution failed';
      setError(`Swap failed: ${msg}`);
      setIsSwapping(false);
    }
  };

  const isInsufficientBalance = useMemo(() => {
    const amt = parseFloat(fromAmount);
    const bal = parseFloat(selectedFromBalance);
    return !isNaN(amt) && !isNaN(bal) && amt > bal;
  }, [fromAmount, selectedFromBalance]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={onBack}
          disabled={isSwapping}
          style={{ padding: '6px' }}
        >
          <ArrowLeft size={16} />
        </button>

        <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Swap Tokens
        </span>

        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setShowSlippageModal(true)}
          title="Slippage Settings"
          style={{ padding: '6px' }}
        >
          <Sliders size={16} />
        </button>
      </div>

      {!txHash ? (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Pay Asset Container */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}
              >
                <span style={{ fontWeight: 600 }}>You Pay</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>
                    Balance: <strong>{parseFloat(selectedFromBalance).toLocaleString()} {fromCode}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleSetHalf}
                    style={{
                      border: 'none',
                      background: 'var(--bg-subtle)',
                      color: 'var(--accent)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    HALF
                  </button>
                  <button
                    type="button"
                    onClick={handleSetMax}
                    style={{
                      border: 'none',
                      background: 'var(--bg-subtle)',
                      color: 'var(--accent)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPickerSearchQuery('');
                    setTokenPickerTarget('from');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                    }}
                  >
                    {fromCode.slice(0, 3)}
                  </div>
                  <span>{fromCode}</span>
                  <ChevronDown size={14} color="var(--text-secondary)" />
                </button>

                <div style={{ flex: 1, textAlign: 'right' }}>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '24px',
                      fontWeight: 800,
                      textAlign: 'right',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: isInsufficientBalance ? 'var(--danger)' : 'var(--text-primary)',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    ≈ {fromFiatVal}
                  </div>
                </div>
              </div>
            </div>

            {/* Central Flip Button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '-18px 0',
                position: 'relative',
                zIndex: 10,
              }}
            >
              <button
                type="button"
                onClick={handleFlip}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  transition: 'transform 0.2s ease',
                }}
                title="Switch token direction"
              >
                <ArrowUpDown size={15} />
              </button>
            </div>

            {/* Receive Asset Container */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}
              >
                <span style={{ fontWeight: 600 }}>You Receive (Estimated)</span>
                <span>
                  Balance: <strong>{parseFloat(selectedToBalance).toLocaleString()} {toCode}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPickerSearchQuery('');
                    setTokenPickerTarget('to');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--success)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                    }}
                  >
                    {toCode.slice(0, 3)}
                  </div>
                  <span>{toCode}</span>
                  <ChevronDown size={14} color="var(--text-secondary)" />
                </button>

                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {isLoadingQuote ? (
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Finding best rate…
                      </span>
                    ) : quote ? (
                      <span>~{quote.expectedOutput}</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>0.00</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    ≈ {toFiatVal}
                  </div>
                </div>
              </div>
            </div>

            {/* Exchange Rate & Slippage Status Bar */}
            {quote && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsInvertedRate(!isInvertedRate)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '11px',
                  }}
                >
                  <Repeat size={11} color="var(--accent)" />
                  <span>
                    {!isInvertedRate
                      ? `1 ${fromCode} ≈ ${quote.rate} ${toCode}`
                      : `1 ${toCode} ≈ ${(1 / parseFloat(quote.rate || '1')).toFixed(4)} ${fromCode}`}
                  </span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={11} />
                    <span>{countdown}s</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={fetchQuote}
                    disabled={isLoadingQuote}
                    style={{ padding: '0 4px', fontSize: '11px', color: 'var(--accent)' }}
                  >
                    <RefreshCw size={11} className={isLoadingQuote ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            )}

            {/* Auto Trustline Notice */}
            {quote?.needsTrustline && (
              <div className="banner banner-info" style={{ gap: '8px', fontSize: '11px' }}>
                <Sparkles size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  No trustline detected for <strong>{toCode}</strong>. Stellith will automatically establish one as part of this transaction (+0.5 XLM reserve).
                </div>
              </div>
            )}

            {/* Threat Scan Warning */}
            {scanResult && (scanResult.verdict === 'blocked' || scanResult.verdict === 'warning') && (
              <div className="banner banner-warning" style={{ gap: '8px', fontSize: '11px' }}>
                <ShieldAlert size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{scanResult.summary || 'Security Alert: Counterfeit asset warning.'}</div>
              </div>
            )}

            {/* Swap Details Breakdown */}
            {quote && (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Minimum Received (Slippage {slippage}%)</span>
                  <span style={{ fontWeight: 600 }}>{quote.minimumReceived} {toCode}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Price Impact</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        quote.priceImpact > 2.0
                          ? 'var(--danger)'
                          : quote.priceImpact > 1.0
                          ? 'var(--warning)'
                          : 'var(--success)',
                    }}
                  >
                    {quote.priceImpact < 0.05 ? '< 0.05%' : `${quote.priceImpact.toFixed(2)}%`}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Order Routing</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                    {quote.route.join(' → ')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  <span className="text-muted">Network Fee</span>
                  <span className="font-mono">0.00001 XLM</span>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--danger-subtle)',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Bottom Swap CTA Button */}
          <div style={{ paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExecuteSwap}
              disabled={
                isSwapping ||
                isLoadingQuote ||
                !quote ||
                isInsufficientBalance ||
                !fromAmount ||
                parseFloat(fromAmount) <= 0
              }
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isSwapping ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Executing DEX Swap…</span>
                </>
              ) : isInsufficientBalance ? (
                <span>Insufficient {fromCode} Balance</span>
              ) : !quote && isLoadingQuote ? (
                <span>Finding Best Route…</span>
              ) : (
                <>
                  <Repeat size={16} />
                  <span>Swap {fromCode} for {toCode}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Confirmed Swap Receipt View */
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--success-subtle)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(46, 213, 115, 0.25)',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
              Swap Completed!
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Swapped{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {fromAmount} {fromCode}
              </strong>{' '}
              for{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                ~{quote?.expectedOutput} {toCode}
              </strong>
            </div>
          </div>

          <div
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '12px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Network:</span>
              <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                {preferences.network}
              </span>
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
              <span className="text-muted">Transaction Hash:</span>
              <a
                href={getExplorerUrl('tx', txHash, preferences.network)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span className="font-mono">{txHash.slice(0, 8)}…{txHash.slice(-6)}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div style={{ width: '100%', marginTop: 'auto' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSuccess}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Slippage Tolerance Settings Modal */}
      {showSlippageModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowSlippageModal(false)}
        >
          <div
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
              borderTop: '1px solid var(--border-subtle)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Slippage Tolerance</span>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setShowSlippageModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Your swap will revert if the execution price changes unfavorably by more than this percentage.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[0.1, 0.5, 1.0, 2.5].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`btn ${slippage === val ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setSlippage(val);
                    setCustomSlippage('');
                  }}
                  style={{ fontSize: '12px', fontWeight: 700, padding: '10px 0' }}
                >
                  {val}%
                </button>
              ))}
            </div>

            <div>
              <label className="label" style={{ marginBottom: '6px' }}>Custom Slippage (%)</label>
              <input
                type="number"
                step="0.1"
                placeholder="Custom %"
                className="input"
                value={customSlippage}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomSlippage(val);
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
                    setSlippage(parsed);
                  }
                }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowSlippageModal(false)}
              style={{ width: '100%', padding: '12px', fontWeight: 700 }}
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* Token Modal Picker */}
      {tokenPickerTarget !== null && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setTokenPickerTarget(null)}
        >
          <div
            style={{
              width: '100%',
              height: '75%',
              background: 'var(--bg-surface)',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
              borderTop: '1px solid var(--border-subtle)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>
                Select {tokenPickerTarget === 'from' ? 'Pay' : 'Receive'} Token
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setTokenPickerTarget(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search filter */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                }}
              />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '32px', fontSize: '12px' }}
                placeholder="Search token code or name…"
                value={pickerSearchQuery}
                onChange={(e) => setPickerSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Token List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {availableTokens
                .filter((t) => t.code.toLowerCase().includes(pickerSearchQuery.toLowerCase()))
                .map((token) => {
                  const isCurrent =
                    tokenPickerTarget === 'from' ? token.code === fromCode : token.code === toCode;

                  const bal =
                    token.code === 'XLM'
                      ? balances?.spendableXlm || '0.00'
                      : balances?.assets.find((a) => a.code === token.code)?.balance || '0.00';

                  const priceInfo = getAssetPriceInfo(token.code);
                  const priceFiat = priceInfo.priceInUsd * currencyInfo.rateFromUsd;

                  return (
                    <button
                      key={token.code + (token.issuer || '')}
                      type="button"
                      onClick={() => {
                        if (tokenPickerTarget === 'from') {
                          if (token.code === toCode) setToCode(fromCode);
                          setFromCode(token.code);
                        } else {
                          if (token.code === fromCode) setFromCode(toCode);
                          setToCode(token.code);
                        }
                        setTokenPickerTarget(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: isCurrent ? 'var(--bg-subtle)' : 'transparent',
                        border: isCurrent ? '1px solid var(--border-focus)' : '1px solid transparent',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          {token.code.slice(0, 3)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{token.code}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {currencyInfo.symbol}{priceFiat.toFixed(priceFiat < 0.1 ? 4 : 2)}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          {parseFloat(bal).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Balance
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
