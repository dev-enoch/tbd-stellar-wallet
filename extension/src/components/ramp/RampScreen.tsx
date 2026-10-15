import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import {
  RampType,
  RampQuote,
  RampTransaction,
  getRampQuotes,
  initiateRampTransaction,
} from '../../services/ramp';
import { formatAddress } from '../../services/stellar';
import {
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Clock,
  Copy,
  Check,
} from 'lucide-react';

interface RampScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

type Step = 'input' | 'compare' | 'instructions' | 'status';

export const RampScreen: React.FC<RampScreenProps> = ({ onBack, onSuccess }) => {
  const { activeAccount } = useWallet();

  const [rampType, setRampType] = useState<RampType>('buy');
  const [amountNgn, setAmountNgn] = useState<string>('20000');
  const [selectedQuote, setSelectedQuote] = useState<RampQuote | null>(null);
  const [activeTx, setActiveTx] = useState<RampTransaction | null>(null);
  const [step, setStep] = useState<Step>('input');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const numAmount = parseFloat(amountNgn) || 0;
  const quotes = getRampQuotes(rampType, numAmount);

  const handleSelectQuote = (q: RampQuote) => {
    setSelectedQuote(q);
    setStep('instructions');
  };

  const handleStartInteractive = () => {
    if (!selectedQuote || !activeAccount) return;

    const tx = initiateRampTransaction({
      quote: selectedQuote,
      userAddress: activeAccount.publicKey,
    });

    setActiveTx(tx);
    setStep('status');
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
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
          onClick={() => {
            if (step === 'instructions') setStep('input');
            else if (step === 'status') onSuccess();
            else onBack();
          }}
          style={{ padding: '4px' }}
        >
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Naira Anchor Ramp</span>
        <div style={{ width: '28px' }} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Step 1: Input & Comparison */}
        {step === 'input' && (
          <>
            {/* Buy vs Sell Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                className={`btn btn-sm ${rampType === 'buy' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRampType('buy')}
                style={{ flex: 1, fontSize: '12px' }}
              >
                Buy USDC with Naira
              </button>
              <button
                className={`btn btn-sm ${rampType === 'sell' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRampType('sell')}
                style={{ flex: 1, fontSize: '12px' }}
              >
                Sell USDC for Naira
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Amount in Nigerian Naira (NGN)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  ₦
                </span>
                <input
                  type="number"
                  className="input"
                  style={{ paddingLeft: '28px', fontSize: '16px', fontWeight: 600 }}
                  value={amountNgn}
                  onChange={(e) => setAmountNgn(e.target.value)}
                  placeholder="20,000"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {['5000', '20000', '50000', '100000'].map((preset) => (
                  <button
                    key={preset}
                    className="btn btn-ghost btn-sm"
                    onClick={() => setAmountNgn(preset)}
                    style={{ flex: 1, fontSize: '11px', padding: '3px 0', border: '1px solid var(--border-subtle)' }}
                  >
                    ₦{parseInt(preset, 10).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Partner Quotes Comparison */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Compare Licensed Partners</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>SEP-24 Compliant</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {quotes.map((q, idx) => (
                  <div
                    key={q.partnerId}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: idx === 0 ? '1px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{q.partnerName}</span>
                          {idx === 0 && (
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              BEST RATE
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>
                          {q.domain} • SEC Registered
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>
                          {rampType === 'buy' ? `${q.netCryptoUsdc} USDC` : `₦${q.fiatAmountNgn.toLocaleString()}`}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          1 USDC = ₦{q.rateNgnPerUsdc}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)' }}>
                      <span>Fee: ₦{q.feeNgn.toFixed(0)} (~{q.arrivalMinutes}m arrival)</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSelectQuote(q)}
                        style={{ fontSize: '11px', padding: '3px 10px' }}
                      >
                        <span>Select</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 2: Payment Instructions & Fraud Warning */}
        {step === 'instructions' && selectedQuote && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Fraud Protection Box */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                <strong>Anti-Fraud Warning:</strong> Never send funds to unsolicited WhatsApp or Telegram agents. Only pay using the verified partner virtual account shown below.
              </div>
            </div>

            {/* All-in Breakdown */}
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Partner:</span>
                <span style={{ fontWeight: 600 }}>{selectedQuote.partnerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Verified Domain:</span>
                <span className="font-mono">{selectedQuote.domain}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Rate:</span>
                <span>1 USDC = ₦{selectedQuote.rateNgnPerUsdc}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Fee:</span>
                <span>₦{selectedQuote.feeNgn.toFixed(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <span>You Receive:</span>
                <span style={{ fontSize: '14px' }}>{selectedQuote.netCryptoUsdc} USDC</span>
              </div>
            </div>

            {/* Virtual Bank Transfer Details */}
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Payment Instructions</span>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Bank Name</div>
                  <div style={{ fontSize: '12px', fontWeight: 500 }}>Providus Bank / Moniepoint</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Account Number</div>
                  <div className="font-mono" style={{ fontSize: '13px', fontWeight: 700 }}>
                    9984729103
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => copyToClipboard('9984729103', 'acc')}
                  style={{ padding: '4px' }}
                >
                  {copiedField === 'acc' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Payment Reference (Required)</div>
                  <div className="font-mono" style={{ fontSize: '12px', fontWeight: 600 }}>
                    STL-984210
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => copyToClipboard('STL-984210', 'ref')}
                  style={{ padding: '4px' }}
                >
                  {copiedField === 'ref' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
              {selectedQuote.referralDisclosure}
            </div>

            <button className="btn btn-primary" onClick={handleStartInteractive} style={{ width: '100%' }}>
              I Have Transferred ₦{selectedQuote.fiatAmountNgn.toLocaleString()}
            </button>
          </div>
        )}

        {/* Step 3: Status Tracker */}
        {step === 'status' && activeTx && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-focus)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <Clock size={22} />
            </div>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>Payment Processing</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                {activeTx.partnerName} is verifying settlement
              </p>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Order ID:</span>
                <span className="font-mono">{activeTx.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Amount Sent:</span>
                <span>₦{activeTx.fiatAmountNgn.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">USDC to Deliver:</span>
                <span style={{ fontWeight: 600 }}>{activeTx.cryptoAmountUsdc} USDC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Destination:</span>
                <span className="font-mono">{formatAddress(activeTx.userAddress, 4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Support Contact:</span>
                <span>{activeTx.supportEmail}</span>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
              Funds typically arrive in your wallet within 5-15 minutes once your bank confirms the transfer.
            </div>

            <button className="btn btn-primary" onClick={onSuccess} style={{ width: '100%' }}>
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
