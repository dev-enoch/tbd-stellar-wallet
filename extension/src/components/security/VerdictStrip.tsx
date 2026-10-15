import React, { useState } from 'react';
import { ScanResult, ThreatVerdict } from '../../services/scanning';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  AlertCircle,
  ShieldOff,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface VerdictStripProps {
  scanResult: ScanResult | null;
  isLoading?: boolean;
  onOverrideChange?: (overridden: boolean) => void;
  isOverridden?: boolean;
}

export const VerdictStrip: React.FC<VerdictStripProps> = ({
  scanResult,
  isLoading = false,
  onOverrideChange,
  isOverridden = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        <span
          style={{
            width: '12px',
            height: '12px',
            border: '2px solid var(--border-subtle)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span>Scanning transaction for security threats…</span>
      </div>
    );
  }

  if (!scanResult) return null;

  const { verdict, title, summary, findings } = scanResult;

  if (verdict === 'disabled') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-tertiary)',
        }}
      >
        <ShieldOff size={14} color="var(--text-tertiary)" />
        <span>Threat scanning is turned off in Settings.</span>
      </div>
    );
  }

  // Theme styling per verdict
  const stylesByVerdict: Record<
    ThreatVerdict,
    { bg: string; border: string; color: string; icon: React.ReactNode }
  > = {
    safe: {
      bg: 'rgba(34, 197, 94, 0.08)',
      border: 'rgba(34, 197, 94, 0.25)',
      color: 'var(--success)',
      icon: <ShieldCheck size={16} color="var(--success)" />,
    },
    warning: {
      bg: 'rgba(234, 179, 8, 0.1)',
      border: 'rgba(234, 179, 8, 0.3)',
      color: '#eab308',
      icon: <AlertTriangle size={16} color="#eab308)" />,
    },
    blocked: {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.35)',
      color: 'var(--danger)',
      icon: <ShieldAlert size={16} color="var(--danger)" />,
    },
    unavailable: {
      bg: 'rgba(249, 115, 22, 0.1)',
      border: 'rgba(249, 115, 22, 0.25)',
      color: '#f97316',
      icon: <AlertCircle size={16} color="#f97316" />,
    },
    disabled: {
      bg: 'var(--bg-card)',
      border: 'var(--border-subtle)',
      color: 'var(--text-secondary)',
      icon: <ShieldOff size={16} color="var(--text-secondary)" />,
    },
  };

  const currentStyle = stylesByVerdict[verdict] || stylesByVerdict.safe;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '10px',
        background: currentStyle.bg,
        border: `1px solid ${currentStyle.border}`,
        overflow: 'hidden',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Primary Banner Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          cursor: findings.length > 0 ? 'pointer' : 'default',
        }}
        onClick={() => findings.length > 0 && setIsExpanded((prev) => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          {currentStyle.icon}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: currentStyle.color }}>
              {title}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {summary}
            </span>
          </div>
        </div>

        {findings.length > 0 && (
          <button
            className="btn btn-ghost btn-icon"
            style={{ padding: '2px', color: 'var(--text-secondary)' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Expanded Threat Findings */}
      {isExpanded && findings.length > 0 && (
        <div
          style={{
            padding: '8px 12px 12px',
            borderTop: `1px solid ${currentStyle.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.05)',
          }}
        >
          {findings.map((finding, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background:
                      finding.severity === 'critical'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(234, 179, 8, 0.2)',
                    color: finding.severity === 'critical' ? 'var(--danger)' : '#eab308',
                  }}
                >
                  {finding.severity}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {finding.title}
                </span>
              </div>
              <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4, paddingLeft: '4px' }}>
                {finding.description}
              </span>
            </div>
          ))}

          {/* Report False Positive Link */}
          <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
            <a
              href="https://github.com/dev-enoch/tbd-stellar-wallet/issues"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '10px',
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
              }}
            >
              <span>Report a wrong verdict</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}

      {/* Warning or Block Override Checkbox */}
      {(verdict === 'warning' || verdict === 'blocked' || verdict === 'unavailable') &&
        onOverrideChange && (
          <div
            style={{
              padding: '8px 12px',
              borderTop: `1px solid ${currentStyle.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <input
              type="checkbox"
              id="threat-override"
              checked={isOverridden}
              onChange={(e) => onOverrideChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label
              htmlFor="threat-override"
              style={{
                fontSize: '11px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {verdict === 'blocked'
                ? 'I understand the critical risk and wish to override block'
                : 'I understand the potential risks and wish to continue'}
            </label>
          </div>
        )}
    </div>
  );
};
