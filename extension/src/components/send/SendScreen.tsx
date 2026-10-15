import React, { useState, useEffect } from 'react';
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
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clipboard,
  Send,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { scanTransaction, ScanResult } from '../../services/scanning';
import { VerdictStrip } from '../security/VerdictStrip';
import { LedgerSigningModal } from '../security/LedgerSigningModal';

interface SendScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

type SendStep = 1 | 2 | 3 | 'result';

export const SendScreen: React.FC<SendScreenProps> = ({ onBack, onSuccess }) => {
  const { activeAccount, preferences } = useWallet();
  const { t } = useI18n();

  // Current Step: 1 (Address), 2 (Amount), 3 (Memo & Review), 'result' (Done)
  const [step, setStep] = useState<SendStep>(1);

  // Form State
  const [recipient, setRecipient] = useState('');
  const [verification, setVerification] = useState<DestinationVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [assetCode, setAssetCode] = useState('XLM');
  const [amount, setAmount] = useState('');

  const [memoType, setMemoType] = useState<'none' | 'text' | 'id' | 'hash'>('none');
  const [memoValue, setMemoValue] = useState('');

  // Async & Error States
  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  // Threat Scanning States (PRD Section 4)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [threatOverridden, setThreatOverridden] = useState(false);

  // Scan transaction before confirmation
  useEffect(() => {
    if (step === 3 && activeAccount && recipient) {
      let isCancelled = false;
      setIsScanning(true);
      setThreatOverridden(false);
      scanTransaction({
        destination: recipient.trim(),
        assetCode,
        amount,
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
    }
  }, [step, recipient, assetCode, amount, memoValue, preferences.threatScanningEnabled, activeAccount]);

  // Load balances
  useEffect(() => {
    if (!activeAccount) return;
    getAccountBalances(activeAccount.publicKey, preferences.network).then(setBalances);
  }, [activeAccount, preferences.network]);

  const selectedAsset = balances?.assets.find((a) => a.code === assetCode);
  const maxSpendable =
    assetCode === 'XLM' ? balances?.spendableXlm || '0.00' : selectedAsset?.balance || '0.00';

  // Handle Pasting Recipient
  const handlePasteRecipient = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRecipient(text.trim());
        triggerAddressVerification(text.trim());
      }
    } catch {
      // Clipboard access denied
    }
  };

  // Trigger address verification on change or paste
  const triggerAddressVerification = async (addr: string) => {
    const trimmed = addr.trim();
    setError('');
    if (!trimmed) {
      setVerification(null);
      return;
    }

    if (!isValidAddress(trimmed)) {
      setVerification(null);
      setError(t.invalidAddress || 'Invalid Stellar address');
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
      if (res.isExchange && memoType === 'none') {
        setMemoType('id');
      }
    } catch {
      setVerification(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSetMax = () => {
    if (assetCode === 'XLM') {
      const maxFloat = parseFloat(maxSpendable);
      const safeMax = Math.max(0, maxFloat - 0.0001).toFixed(4);
      setAmount(safeMax);
    } else {
      setAmount(maxSpendable);
    }
  };

  // Step 1 -> Step 2 validation
  const handleGoToStep2 = () => {
    setError('');
    if (!recipient.trim() || !isValidAddress(recipient.trim())) {
      setError(t.invalidAddress || 'Please enter a valid Stellar address.');
      return;
    }
    if (recipient.trim() === activeAccount?.publicKey) {
      setError('Cannot send payment to your own active account.');
      return;
    }
    setStep(2);
  };

  // Step 2 -> Step 3 validation
  const handleGoToStep3 = () => {
    setError('');
    const amtFloat = parseFloat(amount);
    if (isNaN(amtFloat) || amtFloat <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (amtFloat > parseFloat(maxSpendable)) {
      setError(t.insufficientBalance || 'Insufficient balance.');
      return;
    }
    // If destination is inactive and sending token other than XLM
    if (verification && !verification.exists && assetCode !== 'XLM') {
      setError('Inactive account must first be funded with at least 1 XLM before it can hold tokens.');
      return;
    }
    setStep(3);
  };

  // Step 3 -> Final Submission
  const handleConfirmSend = async () => {
    if (!activeAccount) return;
    setError('');

    // If exchange requires memo
    if (verification?.isExchange && (memoType === 'none' || !memoValue.trim())) {
      setError('Exchange memo is required to prevent loss of funds.');
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
        destination: recipient.trim(),
        assetCode,
        assetIssuer: selectedAsset?.issuer,
        amount,
        memoType,
        memoValue,
        network: preferences.network,
      });

      setTxHash(res.hash);
      setStep('result');
    } catch (err: any) {
      const rawMsg =
        err.response?.data?.extras?.result_codes?.transaction || err.message || 'Payment failed';
      setError(`Transaction error: ${rawMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else if (step === 'result') onSuccess();
    else onBack();
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
        <button
          className="btn btn-ghost btn-icon"
          onClick={handleBack}
          disabled={isSubmitting}
          style={{ padding: '4px' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{t.sendTitle}</span>
          {step !== 'result' && (
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Step {step} of 3
            </span>
          )}
        </div>
        <div style={{ width: '28px' }} />
      </div>

      {/* Step Indicator Bar */}
      {step !== 'result' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-app)',
            flexShrink: 0,
          }}
        >
          {[
            { num: 1, label: '1. Address' },
            { num: 2, label: '2. Amount' },
            { num: 3, label: '3. Memo & Review' },
          ].map((s) => (
            <div
              key={s.num}
              style={{
                textAlign: 'center',
                padding: '6px 2px',
                fontSize: '11px',
                fontWeight: step === s.num ? 700 : 500,
                color: step === s.num ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: step === s.num ? '2px solid var(--accent)' : 'none',
              }}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 16px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* STEP 1: VERIFY ADDRESS */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h2 className="text-base" style={{ marginBottom: '4px' }}>
                Verify Recipient Address
              </h2>
              <p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.4 }}>
                Enter the destination G... or M... address. We verify account status and memo requirements.
              </p>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="recipient">
                {t.recipientLabel}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="recipient"
                  type="text"
                  className="input font-mono"
                  style={{ paddingRight: '40px', fontSize: '12px' }}
                  placeholder="G... or M..."
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    triggerAddressVerification(e.target.value);
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={handlePasteRecipient}
                  title="Paste address"
                  style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}
                >
                  <Clipboard size={14} />
                </button>
              </div>
            </div>

            {/* Verification Status Feedback */}
            {isVerifying ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-subtle)',
                }}
              >
                <Loader2 size={14} className="animate-spin" />
                <span>Verifying address on Stellar network…</span>
              </div>
            ) : verification ? (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: verification.isExchange
                    ? 'var(--warning-subtle)'
                    : 'var(--success-subtle)',
                  border: `1px solid ${verification.isExchange ? 'var(--warning)' : 'var(--success)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                  {verification.isExchange ? (
                    <AlertTriangle size={14} color="var(--warning)" />
                  ) : (
                    <CheckCircle2 size={14} color="var(--success)" />
                  )}
                  <span>
                    {verification.isExchange ? 'Exchange Account Detected' : 'Valid Stellar Address'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                  {verification.message}
                </div>
              </div>
            ) : null}

            {error && <div className="input-error-msg">{error}</div>}

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleGoToStep2}
              disabled={!recipient.trim() || !isValidAddress(recipient.trim()) || isVerifying}
              style={{ marginTop: 'auto', gap: '6px' }}
            >
              <span>Continue to Amount</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* STEP 2: CHOOSE AMOUNT & ASSET */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h2 className="text-base" style={{ marginBottom: '4px' }}>
                Payment Amount
              </h2>
              <div className="text-xs text-muted">
                To: <span className="font-mono">{formatAddress(recipient, 6)}</span>
              </div>
            </div>

            {/* Asset Selector */}
            <div className="form-group">
              <label className="label" htmlFor="assetSelect">
                {t.assetLabel}
              </label>
              <select
                id="assetSelect"
                className="select"
                value={assetCode}
                onChange={(e) => {
                  setAssetCode(e.target.value);
                  setAmount('');
                  setError('');
                }}
              >
                {balances?.assets.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} ({parseFloat(a.balance).toLocaleString()} available)
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="label" htmlFor="amountInput" style={{ margin: 0 }}>
                  {t.amountLabel}
                </label>
                <div className="text-xs text-muted">
                  Spendable: <strong>{parseFloat(maxSpendable).toLocaleString()} {assetCode}</strong>
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="amountInput"
                  type="number"
                  step="any"
                  className="input"
                  style={{ fontSize: '16px', fontWeight: 600, paddingRight: '56px' }}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleSetMax}
                  style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600 }}
                >
                  MAX
                </button>
              </div>
            </div>

            {error && <div className="input-error-msg">{error}</div>}

            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep(1)}
                style={{ flex: 1 }}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGoToStep3}
                disabled={!amount || parseFloat(amount) <= 0}
                style={{ flex: 2, gap: '6px' }}
              >
                <span>Continue to Memo</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MEMO & REVIEW */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h2 className="text-base" style={{ marginBottom: '4px' }}>
                Memo & Final Review
              </h2>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                Review transaction details and specify a destination memo if required.
              </p>
            </div>

            {/* Security Verdict Strip (PRD Section 4) */}
            <VerdictStrip
              scanResult={scanResult}
              isLoading={isScanning}
              onOverrideChange={setThreatOverridden}
              isOverridden={threatOverridden}
            />

            {/* Exchange Memo Warning */}
            {verification?.isExchange && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--warning-subtle)',
                  border: '1px solid var(--warning)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <ShieldAlert size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  <strong>Exchange Memo Required:</strong> This recipient belongs to a known centralized exchange.
                  You <em>must</em> specify your account ID/tag in the memo below, or your deposit will be lost.
                </div>
              </div>
            )}

            {/* Memo Configuration */}
            <div className="panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Memo Type</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['none', 'text', 'id', 'hash'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`btn ${memoType === m ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '2px 6px', fontSize: '10px', textTransform: 'uppercase' }}
                      onClick={() => setMemoType(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {memoType !== 'none' && (
                <input
                  type="text"
                  className="input"
                  style={{ fontSize: '12px' }}
                  placeholder={
                    memoType === 'text'
                      ? 'Text Memo (max 28 bytes)'
                      : memoType === 'id'
                      ? '64-bit integer ID (e.g. 12345678)'
                      : '32-byte hex hash'
                  }
                  value={memoValue}
                  onChange={(e) => setMemoValue(e.target.value)}
                  autoFocus
                />
              )}
            </div>

            {/* Review Summary Breakdown */}
            <div className="panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Recipient</span>
                <span className="font-mono">{formatAddress(recipient, 6)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Amount</span>
                <strong>{amount} {assetCode}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Network Fee</span>
                <span>0.00001 XLM</span>
              </div>
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                <span>Total Debit</span>
                <span>
                  {amount} {assetCode} {assetCode === 'XLM' ? '+ 0.00001 fee' : ''}
                </span>
              </div>
            </div>

            {error && <div className="input-error-msg">{error}</div>}

            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                style={{ flex: 1 }}
              >
                Back
              </button>
              <button
                type="button"
                className={`btn ${scanResult?.verdict === 'blocked' ? 'btn-danger' : 'btn-primary'}`}
                onClick={handleConfirmSend}
                disabled={
                  isSubmitting ||
                  isScanning ||
                  ((scanResult?.verdict === 'blocked' ||
                    scanResult?.verdict === 'warning' ||
                    scanResult?.verdict === 'unavailable') &&
                    !threatOverridden)
                }
                style={{ flex: 2, gap: '6px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Send {amount} {assetCode}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* RESULT SCREEN */}
        {step === 'result' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'space-between',
              textAlign: 'center',
              paddingTop: '20px',
            }}
          >
            <div>
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

              <h2 className="text-lg" style={{ marginBottom: '8px' }}>
                Payment Submitted!
              </h2>
              <p className="text-muted text-xs" style={{ marginBottom: '20px', lineHeight: 1.4 }}>
                Sent <strong>{amount} {assetCode}</strong> to{' '}
                <span className="font-mono">{formatAddress(recipient, 6)}</span>.
              </p>

              {txHash && (
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
              )}
            </div>

            <button className="btn btn-primary btn-lg" onClick={onSuccess}>
              <span>{t.done}</span>
            </button>
          </div>
        )}
      </div>

      <LedgerSigningModal
        isOpen={isSubmitting && activeAccount?.type === 'ledger'}
        destination={recipient}
        amount={amount}
        assetCode={assetCode}
        memo={memoValue}
        network={preferences.network}
        onCancel={() => setIsSubmitting(false)}
      />
    </div>
  );
};
