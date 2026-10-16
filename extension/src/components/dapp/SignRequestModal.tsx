import React, { useState } from 'react';
import { DecodedTransactionPreview } from '../../services/dappProvider';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Code2,
} from 'lucide-react';
import { SlideToConfirm } from '../common/SlideToConfirm';

interface SignRequestModalProps {
  preview: DecodedTransactionPreview;
  origin: string;
  onApprove: () => void;
  onReject: () => void;
}

export const SignRequestModal: React.FC<SignRequestModalProps> = ({
  preview,
  origin,
  onApprove,
  onReject,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);
  const [showRawXdr, setShowRawXdr] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-primary)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px',
      }}
    >
      <div style={{ overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
        {/* Origin Pill */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span className="badge" style={{ fontSize: '11px', fontWeight: 600 }}>{origin}</span>
          <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>
            {preview.network}
          </span>
        </div>

        {/* Headline Sentence (The core plain-language summary) */}
        <h2 style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.35, marginBottom: '14px', letterSpacing: '-0.02em' }}>
          {preview.headline}
        </h2>

        {/* High Risk Warning Banner */}
        {preview.hasHighRisk && (
          <div className="banner banner-danger" style={{ marginBottom: '16px' }}>
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '2px' }}>High Risk Transaction Detected</strong>
              {preview.warnings.join(' ')}
            </div>
          </div>
        )}

        {/* What Leaves / What Arrives Panel */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
          {preview.whatLeaves.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-xs text-muted">What leaves your account</span>
              <span style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '13px' }}>
                -{preview.whatLeaves.join(', ')}
              </span>
            </div>
          )}

          {preview.whatArrives.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-xs text-muted">What arrives in your account</span>
              <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: '13px' }}>
                +{preview.whatArrives.join(', ')}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted">Estimated network fee</span>
            <span className="text-muted font-mono text-xs">{preview.fee} XLM</span>
          </div>
        </div>

        {/* Expandable Technical View */}
        <div className="panel-subtle" style={{ marginBottom: '14px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowTechnical(!showTechnical)}
            style={{
              width: '100%',
              justifyContent: 'space-between',
              padding: 0,
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Code2 size={14} />
              <span>Technical Operations ({preview.operationsCount})</span>
            </div>
            {showTechnical ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showTechnical && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {preview.operations.map((op, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    background: op.isHighRisk ? 'var(--danger-subtle)' : 'var(--bg-surface)',
                    border: `1px solid ${op.isHighRisk ? 'var(--danger)' : 'var(--border-muted)'}`,
                    fontSize: '11px',
                  }}
                >
                  <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{idx + 1}. {op.type}</span>
                    {op.isHighRisk && (
                      <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <AlertTriangle size={10} /> High Risk
                      </span>
                    )}
                  </div>
                  <div className="text-muted" style={{ marginTop: '2px' }}>{op.description}</div>
                  {op.riskWarning && (
                    <div style={{ color: 'var(--danger)', marginTop: '4px', fontSize: '10px' }}>
                      {op.riskWarning}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowRawXdr(!showRawXdr)}
                style={{ fontSize: '10px', color: 'var(--text-tertiary)', alignSelf: 'flex-start', padding: '2px 0' }}
              >
                {showRawXdr ? 'Hide Raw XDR' : 'View Raw Base64 XDR'}
              </button>

              {showRawXdr && (
                <textarea
                  readOnly
                  className="textarea font-mono"
                  style={{ fontSize: '10px', maxHeight: '100px' }}
                  value={preview.rawXdr}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Area: Slide to Confirm protects against accidental signing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
        <SlideToConfirm
          label={preview.hasHighRisk ? 'Slide to Sign High-Risk Tx' : 'Slide to Approve Transaction'}
          loadingLabel="Authorizing & Signing…"
          variant={preview.hasHighRisk ? 'danger' : 'primary'}
          onConfirm={onApprove}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onReject}
          style={{ width: '100%', color: 'var(--text-secondary)' }}
        >
          Cancel & Reject Request
        </button>
      </div>
    </div>
  );
};
