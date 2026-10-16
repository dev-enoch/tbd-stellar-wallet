import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
import {
  isValidAddress,
  formatAddress,
  getExplorerUrl,
  AccountBalanceSummary,
  getAccountBalances,
} from '../../services/stellar';
import {
  submitPayment,
  validateMemo,
  verifyDestinationAddress,
  DestinationVerificationResult,
} from '../../services/transactions';
import { scanTransaction, ScanResult } from '../../services/scanning';
import { getAssetPriceInfo } from '../../services/market';
import { CURRENCY_RATES } from '../../services/history';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clipboard,
  Send,
  Loader2,
  ChevronDown,
  Search,
  X,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface SendScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  initialAssetCode?: string;
}

export const SendScreen: React.FC<SendScreenProps> = ({
  onBack,
  onSuccess,
  initialAssetCode,
}) => {
  const { activeAccount, preferences } = useWallet();
  const { t } = useI18n();

  // Selected Token (Defaults to passed token or XLM)
  const [assetCode, setAssetCode] = useState<string>(initialAssetCode || 'XLM');
  const [isTokenPickerOpen, setIsTokenPickerOpen] = useState<boolean>(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState<string>('');

  // Form Fields
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [memoType, setMemoType] = useState<'none' | 'text' | 'id' | 'hash'>('none');
  const [memoValue, setMemoValue] = useState<string>('');
  const [showMemoField, setShowMemoField] = useState<boolean>(false);

  // Balances & Verification
  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [verification, setVerification] = useState<DestinationVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Execution states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  // Update asset code if initialAssetCode changes
  useEffect(() => {
    if (initialAssetCode) {
      setAssetCode(initialAssetCode);
    }
  }, [initialAssetCode]);

  // Load balances
  useEffect(() => {
    if (!activeAccount) return;
    getAccountBalances(activeAccount.publicKey, preferences.network).then(setBalances);
  }, [activeAccount, preferences.network]);

  // Available tokens in wallet
  const availableTokens = useMemo(() => {
    if (!balances) return [{ code: 'XLM', balance: '0', issuer: undefined }];
    return balances.assets;
  }, [balances]);

  // Selected asset object
  const selectedAsset = useMemo(() => {
    return availableTokens.find((a) => a.code === assetCode) || availableTokens[0];
  }, [availableTokens, assetCode]);

  // Max spendable for the chosen token
  const maxSpendable = useMemo(() => {
    if (assetCode === 'XLM') {
      return balances?.spendableXlm || '0.00';
    }
    return selectedAsset?.balance || '0.00';
  }, [assetCode, balances, selectedAsset]);

  // Live price & conversion
  const currencyInfo = CURRENCY_RATES[preferences.currency] || CURRENCY_RATES.USD;
  const tokenPriceUsd = getAssetPriceInfo(assetCode).priceInUsd;
  const tokenPriceFiat = tokenPriceUsd * currencyInfo.rateFromUsd;
  const fiatEquivalent = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const total = amt * tokenPriceFiat;
    return `${currencyInfo.symbol}${total.toLocaleString(undefined, {
      minimumFractionDigits: total < 0.1 ? 4 : 2,
      maximumFractionDigits: total < 0.1 ? 4 : 2,
    })}`;
  }, [amount, tokenPriceFiat, currencyInfo]);

  // Address Verification
  const triggerAddressVerification = async (addr: string) => {
    const trimmed = addr.trim();
    setError('');
    if (!trimmed) {
      setVerification(null);
      return;
    }

    if (!isValidAddress(trimmed)) {
      setVerification(null);
      setError(t.invalidAddress || 'Invalid Stellar address (expected G... or M...)');
      return;
    }

    if (trimmed === activeAccount?.publicKey) {
      setVerification(null);
      setError('Cannot send payment to your own active account.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyDestinationAddress(trimmed, preferences.network);
      setVerification(res);
      if (res.isExchange) {
        setShowMemoField(true);
        if (memoType === 'none') {
          setMemoType('id');
        }
      }
    } catch {
      setVerification(null);
    } finally {
      setIsVerifying(false);
    }
  };

  // Pasting recipient address
  const handlePasteRecipient = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRecipient(text.trim());
        triggerAddressVerification(text.trim());
      }
    } catch {
      // Clipboard denied
    }
  };

  // Quick amount percentage shortcuts
  const handleApplyPercentage = (pct: number) => {
    const max = parseFloat(maxSpendable);
    if (isNaN(max) || max <= 0) return;

    if (pct === 100) {
      if (assetCode === 'XLM') {
        const safeMax = Math.max(0, max - 0.0001);
        setAmount(safeMax.toFixed(4));
      } else {
        setAmount(max.toString());
      }
    } else {
      const calculated = (max * (pct / 100)).toFixed(4);
      setAmount(calculated);
    }
    setError('');
  };

  // Live Threat Scanning
  useEffect(() => {
    if (activeAccount && recipient && isValidAddress(recipient.trim())) {
      let isCancelled = false;
      setIsScanning(true);
      scanTransaction({
        destination: recipient.trim(),
        assetCode,
        amount: amount || '1',
        memo: memoValue,
        enabled: preferences.threatScanningEnabled,
      }).then((res) => {
        if (!isCancelled) {
          setScanResult(res);
          setIsScanning(false);
        }
      });
      return () => {
        isCancelled = true;
      };
    } else {
      setScanResult(null);
    }
  }, [recipient, assetCode, amount, memoValue, preferences.threatScanningEnabled, activeAccount]);

  // Submit Payment Handler
  const handleSendPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!activeAccount) return;

    const trimmedDest = recipient.trim();
    if (!trimmedDest || !isValidAddress(trimmedDest)) {
      setError('Please provide a valid Stellar destination address (G... or M...).');
      return;
    }

    if (trimmedDest === activeAccount.publicKey) {
      setError('Cannot send payment to your own active account.');
      return;
    }

    const amtFloat = parseFloat(amount);
    if (isNaN(amtFloat) || amtFloat <= 0) {
      setError('Please enter a valid transfer amount greater than 0.');
      return;
    }

    if (amtFloat > parseFloat(maxSpendable)) {
      setError(`Insufficient ${assetCode} balance. You have ${parseFloat(maxSpendable).toLocaleString()} ${assetCode} spendable.`);
      return;
    }

    // Exchange Memo Requirement Guard
    if (verification?.isExchange && (memoType === 'none' || !memoValue.trim())) {
      setShowMemoField(true);
      setError('Exchange destination requires a valid Memo/Tag to prevent loss of funds.');
      return;
    }

    const memoErr = validateMemo(memoType, memoValue);
    if (memoErr) {
      setError(memoErr);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitPayment({
        keypair: activeAccount.keypair,
        signer: activeAccount.signer,
        destination: trimmedDest,
        assetCode,
        assetIssuer: selectedAsset?.issuer,
        amount,
        memoType,
        memoValue,
        network: preferences.network,
      });

      setTxHash(res.hash);
    } catch (err: any) {
      const rawMsg =
        err.response?.data?.extras?.result_codes?.transaction ||
        err.message ||
        'Transaction failed on Stellar network';
      setError(`Payment failed: ${rawMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS / CONFIRMATION RECEIPT SCREEN
  if (txHash) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          background: 'var(--bg-app)',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 20px',
            textAlign: 'center',
            gap: '16px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--success-subtle)',
              border: '2px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success)',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>Payment Sent!</h2>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {amount} {assetCode}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {fiatEquivalent}
            </div>
          </div>

          {/* Receipt Panel */}
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: '380px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '12px',
              textAlign: 'left',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Recipient:</span>
              <span className="font-mono" style={{ fontWeight: 600 }}>
                {formatAddress(recipient.trim(), 6)}
              </span>
            </div>
            {memoValue && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Memo ({memoType}):</span>
                <span className="font-mono">{memoValue}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Network:</span>
              <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                {preferences.network}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
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
                <span>{formatAddress(txHash, 4)}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={onSuccess}
            style={{ width: '100%', maxWidth: '380px', marginTop: '8px' }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // MAIN SINGLE-SCREEN SEND INTERFACE
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-app)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={onBack}
          disabled={isSubmitting}
          style={{ padding: '6px' }}
        >
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>Send Tokens</span>
        <div style={{ width: '28px' }} />
      </div>

      {/* Main Scrollable Body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* 1. TOKEN SELECTOR CARD (Prominently at the top) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Token to Send
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Spendable: <strong style={{ color: 'var(--text-primary)' }}>{parseFloat(maxSpendable).toLocaleString()} {assetCode}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsTokenPickerOpen(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
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
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                {assetCode.slice(0, 3)}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{assetCode}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {assetCode === 'XLM' ? 'Stellar Lumens (Native)' : 'Custom Asset'} • {currencyInfo.symbol}{tokenPriceFiat.toFixed(tokenPriceFiat < 0.1 ? 4 : 2)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>Change</span>
              <ChevronDown size={14} />
            </div>
          </button>
        </div>

        {/* 2. AMOUNT INPUT CARD */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Amount
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleApplyPercentage(pct)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {pct === 100 ? 'MAX' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="number"
              step="any"
              className="input"
              style={{
                fontSize: '22px',
                fontWeight: 700,
                padding: '8px 12px',
                height: '48px',
                paddingRight: '64px',
              }}
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: '12px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
              }}
            >
              {assetCode}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>Estimated Value:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fiatEquivalent}</span>
          </div>
        </div>

        {/* 3. RECIPIENT DESTINATION ADDRESS */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
              To Address
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handlePasteRecipient}
              style={{ padding: '2px 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Clipboard size={11} />
              <span>Paste</span>
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input font-mono"
              style={{ fontSize: '12px', paddingRight: '36px' }}
              placeholder="G... or M... Stellar address"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                triggerAddressVerification(e.target.value);
              }}
            />
          </div>

          {/* Inline Live Address Feedback */}
          {isVerifying ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <Loader2 size={12} className="animate-spin" />
              <span>Verifying address on Stellar network…</span>
            </div>
          ) : verification ? (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                background: verification.isExchange
                  ? 'var(--warning-subtle)'
                  : 'var(--success-subtle)',
                border: `1px solid ${verification.isExchange ? 'var(--warning)' : 'var(--success)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                {verification.isExchange ? (
                  <AlertTriangle size={13} color="var(--warning)" />
                ) : (
                  <CheckCircle2 size={13} color="var(--success)" />
                )}
                <span>
                  {verification.isExchange ? 'Exchange Account Detected' : 'Valid Stellar Address'}
                </span>
              </div>
              <span style={{ color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                {verification.message}
              </span>
            </div>
          ) : null}
        </div>

        {/* 4. MEMO (Auto-open or collapsible toggle) */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setShowMemoField(!showMemoField)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Memo / Tag</span>
              {verification?.isExchange && (
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: 'var(--warning-subtle)',
                    color: 'var(--warning)',
                    border: '1px solid var(--warning)',
                  }}
                >
                  REQUIRED BY EXCHANGE
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 4px', fontSize: '11px' }}
            >
              {showMemoField ? 'Hide' : memoValue ? 'Edit Memo' : '+ Add Memo'}
            </button>
          </div>

          {showMemoField && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Memo Type Selector */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-subtle)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
                {(['none', 'text', 'id', 'hash'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setMemoType(type);
                      if (type === 'none') setMemoValue('');
                    }}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      fontSize: '11px',
                      fontWeight: memoType === type ? 700 : 500,
                      borderRadius: '4px',
                      border: 'none',
                      background: memoType === type ? 'var(--bg-surface)' : 'transparent',
                      color: memoType === type ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>

              {memoType !== 'none' && (
                <input
                  type="text"
                  className="input font-mono"
                  style={{ fontSize: '12px' }}
                  placeholder={
                    memoType === 'id'
                      ? 'e.g. 100234857 (numeric)'
                      : memoType === 'hash'
                      ? '32-byte hex hash'
                      : 'Memo text (max 28 chars)'
                  }
                  value={memoValue}
                  onChange={(e) => setMemoValue(e.target.value)}
                />
              )}
            </div>
          )}
        </div>

        {/* 5. INLINE NETWORK FEE & THREAT SUMMARY */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            padding: '4px 2px',
          }}
        >
          <span>Network Fee:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>0.00001 XLM</span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: 'var(--success)',
                padding: '1px 4px',
                borderRadius: '3px',
                background: 'var(--success-subtle)',
              }}
            >
              SPONSORED
            </span>
          </div>
        </div>

        {isScanning && (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
            }}
          >
            <Loader2 size={12} className="animate-spin" />
            <span>Scanning destination address for threats...</span>
          </div>
        )}

        {scanResult && !isScanning && (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background:
                scanResult.verdict === 'blocked' || scanResult.verdict === 'warning'
                  ? 'var(--danger-subtle)'
                  : 'var(--bg-subtle)',
              border: `1px solid ${
                scanResult.verdict === 'blocked' || scanResult.verdict === 'warning'
                  ? 'var(--danger)'
                  : 'var(--border-subtle)'
              }`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
            }}
          >
            {scanResult.verdict === 'blocked' || scanResult.verdict === 'warning' ? (
              <ShieldAlert size={13} color="var(--danger)" />
            ) : (
              <ShieldCheck size={13} color="var(--success)" />
            )}
            <span>
              {scanResult.verdict === 'blocked' || scanResult.verdict === 'warning'
                ? scanResult.summary || 'Flagged Address: Risk of phishing or malicious activity'
                : 'Stellar Threat Scan: Clean address'}
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-subtle)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '12px',
            }}
          >
            {error}
          </div>
        )}

        {/* PRIMARY SEND ACTION BUTTON */}
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handleSendPayment}
          disabled={isSubmitting || !recipient || !amount || parseFloat(amount) <= 0}
          style={{ width: '100%', marginTop: 'auto', gap: '8px' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Confirming on Stellar…</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>
                Send {amount || '0'} {assetCode}
              </span>
            </>
          )}
        </button>
      </div>

      {/* TOKEN PICKER MODAL */}
      {isTokenPickerOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsTokenPickerOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
              maxHeight: '80%',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
              gap: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>Choose Asset</span>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setIsTokenPickerOpen(false)}
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search filter */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
              />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '32px', fontSize: '12px' }}
                placeholder="Search by name or code…"
                value={tokenSearchQuery}
                onChange={(e) => setTokenSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Token List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {availableTokens
                .filter((t) => t.code.toLowerCase().includes(tokenSearchQuery.toLowerCase()))
                .map((token) => {
                  const isSelected = token.code === assetCode;
                  const priceInfo = getAssetPriceInfo(token.code);
                  const priceFiat = priceInfo.priceInUsd * currencyInfo.rateFromUsd;
                  const valFiat = parseFloat(token.balance) * priceFiat;

                  return (
                    <button
                      key={token.code + (token.issuer || '')}
                      type="button"
                      onClick={() => {
                        setAssetCode(token.code);
                        setAmount('');
                        setError('');
                        setIsTokenPickerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--bg-subtle)' : 'transparent',
                        border: isSelected ? '1px solid var(--border-focus)' : '1px solid transparent',
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
                          {parseFloat(token.balance).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          ≈ {currencyInfo.symbol}{valFiat.toFixed(2)}
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
