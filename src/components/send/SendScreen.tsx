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
  simulatePayment,
  submitPayment,
  validateMemo,
  PaymentSimulationResult,
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
} from 'lucide-react';

interface SendScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

type Step = 'details' | 'review' | 'result';

export const SendScreen: React.FC<SendScreenProps> = ({ onBack, onSuccess }) => {
  const { activeAccount, preferences } = useWallet();
  const { t } = useI18n();

  const [step, setStep] = useState<Step>('details');
  const [recipient, setRecipient] = useState('');
  const [assetCode, setAssetCode] = useState('XLM');
  const [amount, setAmount] = useState('');
  const [memoType, setMemoType] = useState<'none' | 'text' | 'id' | 'hash'>('none');
  const [memoValue, setMemoValue] = useState('');

  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [simulation, setSimulation] = useState<PaymentSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  // Fetch balances on mount
  useEffect(() => {
    if (!activeAccount) return;
    getAccountBalances(activeAccount.publicKey, preferences.network).then(setBalances);
  }, [activeAccount, preferences.network]);

  const selectedAsset = balances?.assets.find((a) => a.code === assetCode);
  const maxSpendable = assetCode === 'XLM'
    ? balances?.spendableXlm || '0.00'
    : selectedAsset?.balance || '0.00';

  const handleSetMax = () => {
    // If XLM, subtract 0.0001 for safety fee buffer
    if (assetCode === 'XLM') {
      const maxFloat = parseFloat(maxSpendable);
      const safeMax = Math.max(0, maxFloat - 0.0001).toFixed(4);
      setAmount(safeMax);
    } else {
      setAmount(maxSpendable);
    }
  };

  const handlePasteRecipient = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setRecipient(text.trim());
    } catch {
      // Clipboard denied
    }
  };

  const handleProceedToReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidAddress(recipient)) {
      setError(t.invalidAddress);
      return;
    }

    if (recipient === activeAccount?.publicKey) {
      setError('Cannot send payment to your own active account.');
      return;
    }

    const amtFloat = parseFloat(amount);
    if (isNaN(amtFloat) || amtFloat <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    if (amtFloat > parseFloat(maxSpendable)) {
      setError(t.insufficientBalance);
      return;
    }

    const memoErr = validateMemo(memoType, memoValue);
    if (memoErr) {
      setError(memoErr);
      return;
    }

    setIsSimulating(true);
    try {
      const sim = await simulatePayment(recipient, assetCode, amount, preferences.network);
      setSimulation(sim);
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to simulate payment');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleConfirmSend = async () => {
    if (!activeAccount) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await submitPayment({
        keypair: activeAccount.keypair,
        destination: recipient,
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
      const rawMsg = err.response?.data?.extras?.result_codes?.transaction || err.message || 'Payment failed';
      setError(`Transaction error: ${rawMsg}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => {
            if (step === 'review') setStep('details');
            else if (step === 'result') onSuccess();
            else onBack();
          }}
          disabled={isSubmitting}
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-xs text-muted" style={{ fontWeight: 600 }}>
          {step === 'details' ? 'Send' : step === 'review' ? 'Review Payment' : 'Status'}
        </span>
      </div>

      {/* STEP 1: DETAILS */}
      {step === 'details' && (
        <form onSubmit={handleProceedToReview} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ overflowY: 'auto' }}>
            <h2 className="text-lg" style={{ marginBottom: '16px' }}>{t.sendTitle}</h2>

            {/* Recipient */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="label">{t.recipientLabel}</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handlePasteRecipient}
                  style={{ padding: '0 4px', fontSize: '11px', gap: '3px' }}
                >
                  <Clipboard size={11} />
                  <span>Paste</span>
                </button>
              </div>
              <input
                type="text"
                className="input font-mono"
                placeholder={t.recipientPlaceholder}
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value.trim());
                  setError('');
                }}
                autoFocus
                required
              />
            </div>

            {/* Asset & Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">{t.assetLabel}</label>
                <select
                  className="select"
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                >
                  {balances?.assets.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="label">{t.amountLabel}</label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleSetMax}
                    style={{ padding: '0 4px', fontSize: '11px', color: 'var(--accent)' }}
                  >
                    {t.maxBtn}
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  className="input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  required
                />
              </div>
            </div>

            {/* Spendable balance helper */}
            <div className="text-xs text-muted" style={{ marginBottom: '14px', textAlign: 'right' }}>
              <span>{t.availableSpendable}: <strong>{parseFloat(maxSpendable).toLocaleString()} {assetCode}</strong></span>
            </div>

            {/* Memo Section */}
            <div className="form-group">
              <label className="label">
                <span>{t.memoLabel} ({t.memoOptional})</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <select
                  className="select"
                  value={memoType}
                  onChange={(e) => setMemoType(e.target.value as any)}
                >
                  <option value="none">None</option>
                  <option value="text">Text</option>
                  <option value="id">ID</option>
                  <option value="hash">Hash</option>
                </select>

                <input
                  type="text"
                  className="input font-mono"
                  placeholder={memoType === 'none' ? 'No memo' : memoType === 'text' ? 'Max 28 bytes' : memoType === 'id' ? 'Number' : '64 hex chars'}
                  value={memoValue}
                  onChange={(e) => setMemoValue(e.target.value)}
                  disabled={memoType === 'none'}
                />
              </div>
            </div>

            {error && <div className="input-error-msg">{error}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSimulating || !recipient || !amount}
          >
            {isSimulating ? (
              <span>Validating…</span>
            ) : (
              <>
                <span>{t.reviewSend}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: REVIEW */}
      {step === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div>
            <h2 className="text-lg" style={{ marginBottom: '6px' }}>{t.reviewSend}</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
              Please verify payment details before sending.
            </p>

            {/* Simulation Warnings */}
            {simulation?.warning && (
              <div className="banner banner-warning">
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{simulation.warning}</div>
              </div>
            )}

            {simulation?.requiresMemo && memoType === 'none' && (
              <div className="banner banner-danger">
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{t.memoRequiredWarn}</div>
              </div>
            )}

            {/* Review Panel */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs text-muted">Amount</span>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{amount} {assetCode}</span>
              </div>

              <div className="divider" />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-xs text-muted">Recipient</span>
                <span className="font-mono text-xs" title={recipient}>{formatAddress(recipient, 6)}</span>
              </div>

              {memoType !== 'none' && memoValue && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-xs text-muted">Memo ({memoType.toUpperCase()})</span>
                  <span className="font-mono text-xs">{memoValue}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-xs text-muted">{t.networkFee}</span>
                <span className="text-xs text-muted">~{simulation?.estimatedFee || '0.00001'} XLM</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-xs text-muted">Network</span>
                <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>
                  {preferences.network}
                </span>
              </div>
            </div>

            {error && <div className="input-error-msg" style={{ marginTop: '12px' }}>{error}</div>}
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleConfirmSend}
            disabled={isSubmitting}
            style={{ gap: '8px' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Send {amount} {assetCode}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 3: RESULT */}
      {step === 'result' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', textAlign: 'center' }}>
          <div style={{ paddingTop: '24px' }}>
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

            <h2 className="text-lg" style={{ marginBottom: '8px' }}>{t.sendSuccess}</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
              Transferred <strong>{amount} {assetCode}</strong> to {formatAddress(recipient, 5)}
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
