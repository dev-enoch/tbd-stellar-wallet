import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
import { getExplorerUrl } from '../../services/stellar';
import QRCode from 'qrcode';
import { ArrowLeft, Copy, Check, ExternalLink, ShieldCheck, X } from 'lucide-react';

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
      width: 200,
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
          style={{ padding: '6px' }}
        >
          <ArrowLeft size={16} />
        </button>

        <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {t.receiveTitle}
        </span>

        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={onBack}
          style={{ padding: '6px' }}
        >
          <X size={16} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Account Identifier */}
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>
              {activeAccount?.name || 'Main Account'}
            </h2>
            <span
              className="badge badge-accent"
              style={{ textTransform: 'capitalize', fontSize: '11px', padding: '3px 8px' }}
            >
              Stellar {preferences.network}
            </span>
          </div>

          {/* QR Code Card */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '16px',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              width: '200px',
              height: '200px',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Stellar public key QR"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            ) : (
              <div style={{ fontSize: '12px', color: '#666' }}>Generating QR code…</div>
            )}
          </div>

          {/* Full Address Display with Copy Button */}
          <div
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              {t.yourAddress}
            </div>

            <div
              className="font-mono"
              style={{
                fontSize: '12px',
                wordBreak: 'break-all',
                lineHeight: 1.6,
                background: 'var(--bg-subtle)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '12px',
                userSelect: 'all',
              }}
            >
              {address}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCopy}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 700,
                gap: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy Address</span>
                </>
              )}
            </button>
          </div>

          {/* Safety Disclaimer Banner */}
          <div
            className="banner banner-info"
            style={{ width: '100%', gap: '8px', fontSize: '11px', lineHeight: 1.4 }}
          >
            <ShieldCheck
              size={16}
              style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent)' }}
            />
            <div>
              Send only <strong>Stellar network assets</strong> (XLM, USDC, EURC, and registered trustlines) to this address. Incoming transfers are credited instantly.
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a
            href={getExplorerUrl('account', address, preferences.network)}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '11px',
              color: 'var(--accent)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <span>View Account on StellarExpert</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
