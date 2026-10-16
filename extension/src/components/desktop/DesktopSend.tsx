import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import {
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
import { SlideToConfirm } from '../common/SlideToConfirm';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Search,
  ShieldCheck,
  Copy,
  Check,
  Info,
  RefreshCw,
} from 'lucide-react';

interface DesktopSendProps {
  initialAssetCode?: string;
  onSuccess?: () => void;
}

export const DesktopSend: React.FC<DesktopSendProps> = ({
  initialAssetCode = 'XLM',
  onSuccess,
}) => {
  const { activeAccount, preferences } = useWallet();

  // Selected Token
  const [assetCode, setAssetCode] = useState<string>(initialAssetCode);
  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);

  // Form Fields
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [memoType, setMemoType] = useState<'none' | 'text' | 'id' | 'hash'>('none');
  const [memoValue, setMemoValue] = useState<string>('');

  // Destination verification & threat scanning
  const [verification, setVerification] = useState<DestinationVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Submission & State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Token picker modal
  const [isTokenPickerOpen, setIsTokenPickerOpen] = useState<boolean>(false);
  const [tokenSearch, setTokenSearch] = useState<string>('');

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

  // Selected asset balance
  const selectedAsset = useMemo(() => {
    if (!balances) return null;
    return balances.assets.find((a) => a.code === assetCode) || null;
  }, [balances, assetCode]);

  const maxSpendable = useMemo(() => {
    if (!selectedAsset) return '0.00';
    if (selectedAsset.isNative && balances) {
      return balances.spendableXlm;
    }
    return selectedAsset.balance;
  }, [selectedAsset, balances]);

  // Destination Verification with Debounce
  useEffect(() => {
    const trimmed = recipient.trim();
    if (!trimmed || trimmed.length < 5) {
      setVerification(null);
      setScanResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsVerifying(true);
      try {
        const [verResult, scanRes] = await Promise.all([
          verifyDestinationAddress(trimmed, preferences.network),
          scanTransaction({
            destination: trimmed,
            amount,
            assetCode,
          }),
        ]);
        setVerification(verResult);
        setScanResult(scanRes);

        // Auto-switch to memo if exchange detected
        if (verResult.isExchange && memoType === 'none') {
          setMemoType('id');
        }
      } catch (err) {
        console.warn('Verification error:', err);
      } finally {
        setIsVerifying(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [recipient, amount, assetCode, preferences.network, memoType]);

  // Execute Payment
  const handleExecuteSend = async () => {
    if (!activeAccount) return;
    setIsSubmitting(true);
    setError('');

    try {
      // Validate memo
      if (memoType !== 'none') {
        const memoErr = validateMemo(memoType, memoValue);
        if (memoErr) {
          throw new Error(memoErr);
        }
      }

      const res = await submitPayment({
        keypair: activeAccount.keypair,
        destination: recipient.trim(),
        amount: amount.trim(),
        assetCode,
        assetIssuer: selectedAsset?.issuer,
        memoType: memoType !== 'none' ? memoType : undefined,
        memoValue: memoType !== 'none' ? memoValue.trim() : undefined,
        network: preferences.network,
        signer: activeAccount.signer,
      });

      setTxHash(res.hash);
      await loadBalances();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Payment submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // USD Fiat equivalents
  const priceInfo = getAssetPriceInfo(assetCode);
  const fiatAmount = (parseFloat(amount || '0') * priceInfo.priceInUsd).toFixed(2);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Send On-Chain Stellar Payment
        </h2>
        <p className="text-muted" style={{ margin: 0, fontSize: '12.5px' }}>
          Transfer native XLM or anchored token trustlines with sub-second ledger finality.
        </p>
      </div>

      {/* Main 2-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr', gap: '28px', alignItems: 'start' }}>
        {/* =========================================================================
            LEFT COLUMN: SEND PAYMENT FORM
            ========================================================================= */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Success Overlay */}
          {txHash ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 12px', gap: '16px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={32} color="var(--success)" />
              </div>

              <div>
                <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 6px' }}>Payment Confirmed On-Chain!</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
                  Successfully delivered {amount} {assetCode} to {formatAddress(recipient, 6)}.
                </p>
              </div>

              <div
                className="font-mono"
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11.5px',
                  wordBreak: 'break-all',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <span>{txHash}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => {
                    navigator.clipboard.writeText(txHash);
                    setCopiedHash(true);
                    setTimeout(() => setCopiedHash(false), 2000);
                  }}
                  title="Copy Transaction Hash"
                  style={{ padding: '4px' }}
                >
                  {copiedHash ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                </button>
              </div>

              <a
                href={getExplorerUrl('tx', txHash, preferences.network)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ gap: '6px', fontSize: '12px' }}
              >
                <span>Inspect on StellarExpert Explorer</span>
                <ExternalLink size={13} />
              </a>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setTxHash('');
                  setAmount('');
                  setRecipient('');
                  setMemoValue('');
                }}
                style={{ width: '100%', marginTop: '8px' }}
              >
                Send Another Payment
              </button>
            </div>
          ) : (
            <>
              {/* Error Banner */}
              {error && (
                <div
                  style={{
                    padding: '12px 14px',
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
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Asset Selection */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Select Asset to Transfer
                </label>
                <button
                  type="button"
                  onClick={() => setIsTokenPickerOpen(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '11px',
                      }}
                    >
                      {assetCode.substring(0, 3)}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{assetCode}</div>
                      <div className="text-tertiary" style={{ fontSize: '11px' }}>
                        Spendable: {parseFloat(maxSpendable).toLocaleString()} {assetCode}
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={16} color="var(--text-tertiary)" />
                </button>
              </div>

              {/* 2. Destination Recipient */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Destination Address (Recipient)
                  </label>
                  {isVerifying && (
                    <span style={{ fontSize: '11px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={11} className="spin" />
                      <span>Verifying on Ledger...</span>
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input font-mono"
                    placeholder="G... (Public Key), M... (Muxed), or federation*domain.com"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    style={{ fontSize: '12.5px', paddingRight: '36px' }}
                  />
                  {verification?.valid && (
                    <CheckCircle2
                      size={16}
                      color="var(--success)"
                      style={{ position: 'absolute', right: '12px', top: '12px' }}
                    />
                  )}
                </div>

                {/* Threat / Memo Requirement Warnings */}
                {verification?.isExchange && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(234, 179, 8, 0.12)',
                      border: '1px solid var(--warning)',
                      color: 'var(--warning)',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Memo Required:</strong> Recipient is a centralized exchange address. You must provide a valid memo ID to credit your deposit!
                    </span>
                  </div>
                )}

                {verification && !verification.exists && verification.valid && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid var(--accent)',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Info size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                    <span>
                      Destination account is not yet funded. This payment will execute a <strong>CreateAccount</strong> operation on the ledger (minimum 1 XLM required).
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Send Amount */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Payment Amount
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const maxVal = parseFloat(maxSpendable) || 0;
                          const calculated = ((maxVal * pct) / 100).toFixed(4);
                          setAmount(calculated);
                        }}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {pct === 100 ? 'MAX' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <input
                    type="number"
                    className="input font-mono"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ fontSize: '26px', fontWeight: 800, border: 'none', background: 'transparent', padding: 0 }}
                  />
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>{assetCode}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>≈ ${fiatAmount} USD</div>
                  </div>
                </div>
              </div>

              {/* 4. Stellar Memo Field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Transaction Memo
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['none', 'text', 'id', 'hash'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMemoType(type)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '10.5px',
                          fontWeight: memoType === type ? 700 : 500,
                          border: memoType === type ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                          background: memoType === type ? 'var(--bg-subtle)' : 'transparent',
                          color: memoType === type ? 'var(--text-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {memoType !== 'none' && (
                  <input
                    type="text"
                    className="input font-mono"
                    placeholder={
                      memoType === 'text'
                        ? 'Memo text (max 28 bytes)'
                        : memoType === 'id'
                        ? '64-bit uint64 ID (e.g. 1029482)'
                        : '32-byte hash'
                    }
                    value={memoValue}
                    onChange={(e) => setMemoValue(e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                )}
              </div>

              {/* Slide to Confirm */}
              <div style={{ marginTop: '10px' }}>
                <SlideToConfirm
                  onConfirm={handleExecuteSend}
                  label="Slide to Send Payment"
                  loadingLabel="Broadcasting to Stellar Ledger..."
                  disabled={
                    !recipient.trim() ||
                    parseFloat(amount || '0') <= 0 ||
                    parseFloat(amount || '0') > parseFloat(maxSpendable) ||
                    isSubmitting
                  }
                  isLoading={isSubmitting}
                />
              </div>
            </>
          )}
        </div>

        {/* =========================================================================
            RIGHT COLUMN: TRANSACTION PREVIEW & SAFETY AUDIT
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Transaction Preview & Audit</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-secondary">Sending Asset</span>
                <span style={{ fontWeight: 700 }}>{assetCode}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-secondary">Payment Amount</span>
                <span style={{ fontWeight: 700 }}>
                  {amount || '0.00'} {assetCode} <span className="text-tertiary" style={{ fontSize: '11px' }}>(≈ ${fiatAmount})</span>
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-secondary">Recipient</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>
                  {recipient.trim() ? formatAddress(recipient.trim(), 6) : 'None Specified'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-secondary">Memo Type</span>
                <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  {memoType !== 'none' ? `${memoType} (${memoValue || 'Empty'})` : 'None'}
                </span>
              </div>

              {scanResult && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="text-secondary">Security Screening</span>
                  <span style={{ color: scanResult.verdict === 'safe' ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                    {scanResult.verdict === 'safe' ? '✓ Threat Screening Passed' : scanResult.title}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-secondary">Network Gas Fee</span>
                <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  {activeAccount?.type === 'passkey' ? 'Sponsored (Free)' : '0.00001 XLM (100 stroops)'}
                </span>
              </div>
            </div>
          </div>

          {/* Safety & Protocol Guarantees Card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
              <ShieldCheck size={16} color="var(--success)" />
              <span>Stellar Network Guarantees</span>
            </div>

            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Transactions reach irrevocable consensus settlement in <strong>3 to 5 seconds</strong>.</li>
              <li>Base reserve of 1.0 XLM is permanently guarded so your account is never locked.</li>
              <li>Cryptographically signed with on-device keys — no private keys ever touch external servers.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Token Selector Modal */}
      {isTokenPickerOpen && (
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
          onClick={() => setIsTokenPickerOpen(false)}
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Select Token to Send</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsTokenPickerOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search token..."
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                style={{ paddingLeft: '32px', height: '34px', fontSize: '12px' }}
                autoFocus
              />
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {balances?.assets
                .filter((a) => a.code.toLowerCase().includes(tokenSearch.toLowerCase()))
                .map((token) => (
                  <div
                    key={token.code + (token.issuer || '')}
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
                      setAssetCode(token.code);
                      setIsTokenPickerOpen(false);
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
                        <div className="text-tertiary" style={{ fontSize: '11px' }}>
                          Balance: {parseFloat(token.balance).toLocaleString()}
                        </div>
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
