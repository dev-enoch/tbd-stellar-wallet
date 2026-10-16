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
  ArrowRight,
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
  Copy,
  Check,
  Edit2,
} from 'lucide-react';

interface SendScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  initialAssetCode?: string;
}

type SendStage = 'amount' | 'recipient' | 'confirm' | 'receipt';

export const SendScreen: React.FC<SendScreenProps> = ({
  onBack,
  onSuccess,
  initialAssetCode,
}) => {
  const { activeAccount, preferences } = useWallet();
  const { t } = useI18n();

  // Navigation stage (Guided Flow without step indicators)
  const [stage, setStage] = useState<SendStage>('amount');

  // Selected Token (Defaults to passed token or XLM)
  const [assetCode, setAssetCode] = useState<string>(initialAssetCode || 'XLM');
  const [isTokenPickerOpen, setIsTokenPickerOpen] = useState<boolean>(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState<string>('');

  // Form Fields
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [memoType, setMemoType] = useState<'none' | 'text' | 'id' | 'hash'>('none');
  const [memoValue, setMemoValue] = useState<string>('');

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
  const [copiedDest, setCopiedDest] = useState<boolean>(false);

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

  // Stage 1 -> Stage 2: Validate Amount
  const handleProceedToRecipient = () => {
    setError('');
    const amtFloat = parseFloat(amount);
    if (isNaN(amtFloat) || amtFloat <= 0) {
      setError('Please enter a valid transfer amount greater than 0.');
      return;
    }
    if (amtFloat > parseFloat(maxSpendable)) {
      setError(
        `Insufficient ${assetCode} balance. You have ${parseFloat(maxSpendable).toLocaleString()} ${assetCode} spendable.`
      );
      return;
    }
    setStage('recipient');
  };

  // Stage 2 -> Stage 3: Validate Recipient & Memo
  const handleProceedToConfirm = () => {
    setError('');
    const trimmedDest = recipient.trim();
    if (!trimmedDest || !isValidAddress(trimmedDest)) {
      setError('Please provide a valid Stellar destination address (G... or M...).');
      return;
    }
    if (trimmedDest === activeAccount?.publicKey) {
      setError('Cannot send payment to your own active account.');
      return;
    }

    if (verification?.isExchange && (memoType === 'none' || !memoValue.trim())) {
      setError('Exchange destination requires a valid Memo / Tag to credit your deposit.');
      return;
    }

    if (memoType !== 'none' && memoValue.trim()) {
      const memoErr = validateMemo(memoType, memoValue.trim());
      if (memoErr) {
        setError(memoErr);
        return;
      }
    }

    setStage('confirm');
  };

  // Stage 3 -> Execute Payment
  const handleExecutePayment = async () => {
    setError('');
    if (!activeAccount) return;

    setIsSubmitting(true);
    try {
      const res = await submitPayment({
        keypair: activeAccount.keypair,
        signer: activeAccount.signer,
        destination: recipient.trim(),
        amount: amount.trim(),
        assetCode,
        assetIssuer: selectedAsset?.issuer,
        memoType,
        memoValue: memoValue.trim(),
        network: preferences.network,
      });

      setTxHash(res.hash);
      setStage('receipt');
    } catch (err: any) {
      const msg =
        err.response?.data?.extras?.result_codes?.transaction ||
        err.message ||
        'Transaction submission failed';
      setError(`Payment error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyDest = () => {
    navigator.clipboard.writeText(recipient);
    setCopiedDest(true);
    setTimeout(() => setCopiedDest(false), 2000);
  };

  // Header Title based on stage
  const getHeaderTitle = () => {
    switch (stage) {
      case 'amount':
        return 'Send Token';
      case 'recipient':
        return 'Recipient & Memo';
      case 'confirm':
        return 'Review Transfer';
      case 'receipt':
        return 'Payment Sent';
    }
  };

  // Back button handler
  const handleBack = () => {
    setError('');
    if (stage === 'receipt') {
      onSuccess();
    } else if (stage === 'confirm') {
      setStage('recipient');
    } else if (stage === 'recipient') {
      setStage('amount');
    } else {
      onBack();
    }
  };

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
      {/* Top Header - Guided & Minimal (No Progress Bar) */}
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
          onClick={handleBack}
          disabled={isSubmitting}
          style={{ padding: '6px' }}
        >
          <ArrowLeft size={16} />
        </button>

        <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {getHeaderTitle()}
        </span>

        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={onBack}
          disabled={isSubmitting}
          style={{ padding: '6px' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ================= STAGE 1: AMOUNT & ASSET ================= */}
        {stage === 'amount' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              flex: 1,
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Asset Picker Trigger Card */}
              <div>
                <label className="label" style={{ marginBottom: '6px' }}>
                  Select Asset
                </label>
                <button
                  type="button"
                  onClick={() => setIsTokenPickerOpen(true)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {assetCode.slice(0, 3)}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{assetCode}</div>
                      <div className="font-mono text-muted text-xs">
                        Balance: {parseFloat(maxSpendable).toLocaleString()} {assetCode}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>
                      Change
                    </span>
                    <ChevronDown size={14} color="var(--text-secondary)" />
                  </div>
                </button>
              </div>

              {/* Hero Amount Input Card */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Enter Transfer Amount
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'center',
                    gap: '4px',
                    width: '100%',
                  }}
                >
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    autoFocus
                    style={{
                      fontSize: '36px',
                      fontWeight: 800,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      textAlign: 'center',
                      color: 'var(--text-primary)',
                      width: '100%',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Live Fiat Value */}
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  ≈ {fiatEquivalent}
                </div>

                {/* Percentage Shortcuts */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '12px',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleApplyPercentage(pct)}
                      style={{
                        flex: 1,
                        maxWidth: '70px',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '6px 4px',
                      }}
                    >
                      {pct === 100 ? 'MAX' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spendable balance notice */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  padding: '0 4px',
                }}
              >
                <span>Available to Send</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {parseFloat(maxSpendable).toLocaleString()} {assetCode}
                </span>
              </div>

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

            {/* Bottom Proceed CTA */}
            <div style={{ paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleProceedToRecipient}
                disabled={!amount || parseFloat(amount) <= 0}
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
                <span>Continue to Recipient</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STAGE 2: RECIPIENT & MEMO ================= */}
        {stage === 'recipient' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              flex: 1,
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Context Summary Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sending</span>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>
                    {amount} {assetCode} <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>({fiatEquivalent})</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStage('amount')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent)' }}
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>

              {/* Recipient Input Card */}
              <div>
                <label className="label" style={{ marginBottom: '6px' }}>
                  Destination Stellar Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input font-mono"
                    placeholder="G... or M... or name*domain.com"
                    value={recipient}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRecipient(val);
                      triggerAddressVerification(val);
                    }}
                    autoFocus
                    style={{ fontSize: '12px', paddingRight: '80px' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      gap: '4px',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handlePasteRecipient}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      <Clipboard size={12} style={{ marginRight: '3px' }} />
                      <span>Paste</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Address verification loading */}
              {isVerifying && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Verifying ledger destination…</span>
                </div>
              )}

              {/* Exchange Memo Alert */}
              {verification?.isExchange && (
                <div className="banner banner-warning" style={{ fontSize: '12px', gap: '8px' }}>
                  <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Exchange Destination Detected:</strong> {verification.message || 'Exchange requires a deposit Memo / Tag to credit your funds.'}
                  </div>
                </div>
              )}

              {/* Threat Scan Result Strip */}
              {isScanning && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
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
                  <span>Scanning destination for threat intelligence…</span>
                </div>
              )}

              {scanResult && !isScanning && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
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
                    gap: '8px',
                    fontSize: '11px',
                  }}
                >
                  {scanResult.verdict === 'blocked' || scanResult.verdict === 'warning' ? (
                    <ShieldAlert size={14} color="var(--danger)" style={{ flexShrink: 0 }} />
                  ) : (
                    <ShieldCheck size={14} color="var(--success)" style={{ flexShrink: 0 }} />
                  )}
                  <span>
                    {scanResult.verdict === 'blocked' || scanResult.verdict === 'warning'
                      ? scanResult.summary || 'Security Alert: Destination flagged for malicious activity.'
                      : 'Stellar Threat Scan: Clean address verified'}
                  </span>
                </div>
              )}

              {/* Memo Section */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="label" style={{ margin: 0 }}>
                    Memo / Reference {verification?.isExchange ? <span style={{ color: 'var(--danger)' }}>*Required</span> : '(Optional)'}
                  </label>

                  {/* Memo Type Switcher */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['none', 'text', 'id', 'hash'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setMemoType(type);
                          if (type === 'none') setMemoValue('');
                        }}
                        style={{
                          fontSize: '10px',
                          padding: '3px 7px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background: memoType === type ? 'var(--accent)' : 'var(--bg-subtle)',
                          color: memoType === type ? '#ffffff' : 'var(--text-secondary)',
                        }}
                      >
                        {type === 'none' ? 'None' : type}
                      </button>
                    ))}
                  </div>
                </div>

                {memoType !== 'none' && (
                  <input
                    type="text"
                    className="input font-mono"
                    placeholder={
                      memoType === 'id'
                        ? '64-bit integer (e.g. 104928502)'
                        : memoType === 'text'
                        ? 'Max 28 UTF-8 bytes'
                        : '32-byte hex hash'
                    }
                    value={memoValue}
                    onChange={(e) => setMemoValue(e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                )}
              </div>

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

            {/* Bottom Review CTA */}
            <div style={{ paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleProceedToConfirm}
                disabled={!recipient.trim() || !isValidAddress(recipient.trim())}
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
                <span>Review Transaction</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STAGE 3: REVIEW & CONFIRM ================= */}
        {stage === 'confirm' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              flex: 1,
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Big Summary Amount Card */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '24px 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Total Amount to Send
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {amount} {assetCode}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  ≈ {fiatEquivalent}
                </div>
              </div>

              {/* Transaction Breakdown Table */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">From Account</span>
                  <span style={{ fontWeight: 600 }}>{activeAccount?.name || 'Main Account'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">Recipient</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="font-mono" style={{ fontWeight: 600 }}>
                      {formatAddress(recipient, 6)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={handleCopyDest}
                      style={{ padding: '2px' }}
                      title="Copy Address"
                    >
                      {copiedDest ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {memoType !== 'none' && memoValue && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Memo ({memoType.toUpperCase()})</span>
                    <span className="font-mono" style={{ fontWeight: 600 }}>
                      {memoValue}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">Network</span>
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
                    paddingTop: '10px',
                  }}
                >
                  <span className="text-muted">Estimated Network Fee</span>
                  <span style={{ fontWeight: 600 }}>0.00001 XLM</span>
                </div>
              </div>

              {/* Security Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}
              >
                <ShieldCheck size={15} color="var(--success)" style={{ flexShrink: 0 }} />
                <span>Verified Stellar ledger transaction · Instant finality (~3-5 seconds)</span>
              </div>

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

            {/* Bottom Confirm Action */}
            <div style={{ paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecutePayment}
                disabled={isSubmitting}
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
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing & Submitting…</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Confirm & Send Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= STAGE 4: RECEIPT ================= */}
        {stage === 'receipt' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              flex: 1,
              padding: '24px 0',
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
                Payment Sent Successfully!
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Your payment of{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {amount} {assetCode}
                </strong>{' '}
                has been confirmed on the Stellar ledger.
              </div>
            </div>

            {/* Receipt Card */}
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
                <span className="text-muted">Recipient:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>
                  {formatAddress(recipient, 6)}
                </span>
              </div>

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
                  <span className="font-mono">{formatAddress(txHash, 4)}</span>
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
      </div>

      {/* Token Selector Modal */}
      {isTokenPickerOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setIsTokenPickerOpen(false)}
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
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Choose Asset</span>
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
                            {currencyInfo.symbol}
                            {priceFiat.toFixed(priceFiat < 0.1 ? 4 : 2)}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          {parseFloat(token.balance).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          ≈ {currencyInfo.symbol}
                          {valFiat.toFixed(2)}
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
