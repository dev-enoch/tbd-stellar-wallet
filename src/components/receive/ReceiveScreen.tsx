import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
import { getExplorerUrl } from '../../services/stellar';
import QRCode from 'qrcode';
import { ArrowLeft, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';

interface ReceiveScreenProps {
  onBack: () => void;
}

export const ReceiveScreen: React.FC<ReceiveScreenProps> = ({ onBack }) => {
  const { activeAccount, preferences } = useWallet();
  const { t } = useI18n();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const address = activeAccount?.publicKey || '';

  useEffect(() => {
    if (!address) return;
    QRCode.toDataURL(address, {
      margin: 1,
      width: 180,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [address]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', justifyContent: 'space-between' }}>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button className="btn btn-ghost btn-icon" onClick={onBack}>
            <ArrowLeft size={16} />
          </button>
          <span className="text-xs text-muted" style={{ fontWeight: 600 }}>{t.receiveTitle}</span>
          <div style={{ width: '28px' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 className="text-lg" style={{ marginBottom: '4px' }}>{activeAccount?.name || 'My Account'}</h2>
          <span className="badge badge-accent" style={{ textTransform: 'capitalize', fontSize: '11px' }}>
            {preferences.network}
          </span>
        </div>

        {/* QR Code Container */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px',
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            width: '180px',
            height: '180px',
            margin: '0 auto 20px auto',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Stellar address QR" style={{ width: '100%', height: '100%' }} />
          ) : (
            <div className="text-xs text-muted">Generating QR…</div>
          )}
        </div>

        {/* Full Address Display with Copy Button */}
        <div className="panel" style={{ marginBottom: '16px', padding: '12px' }}>
          <div className="label" style={{ marginBottom: '6px' }}>{t.yourAddress}</div>
          <div
            className="font-mono text-xs"
            style={{
              wordBreak: 'break-all',
              lineHeight: 1.5,
              background: 'var(--bg-subtle)',
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-muted)',
              marginBottom: '10px',
              userSelect: 'all',
            }}
          >
            {address}
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleCopy}
            style={{ width: '100%', gap: '6px' }}
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>{t.copied}</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>{t.copy} Address</span>
              </>
            )}
          </button>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="banner banner-info" style={{ gap: '8px' }}>
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent)' }} />
          <div style={{ fontSize: '11px' }}>{t.receiveDisclaimer}</div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <a
          href={getExplorerUrl('account', address, preferences.network)}
          target="_blank"
          rel="noreferrer"
          className="text-tertiary"
          style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <span>{t.viewOnExplorer}</span>
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
};
