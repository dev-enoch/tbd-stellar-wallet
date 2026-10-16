import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { getExplorerUrl } from '../../services/stellar';
import QRCode from 'qrcode';
import {
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  QrCode,
} from 'lucide-react';

export const DesktopReceive: React.FC = () => {
  const { activeAccount, preferences } = useWallet();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedUri, setCopiedUri] = useState<boolean>(false);

  // Payment Request generator state
  const [requestAsset, setRequestAsset] = useState<string>('XLM');
  const [requestAmount, setRequestAmount] = useState<string>('');
  const [requestMemo, setRequestMemo] = useState<string>('');
  const [requestQrUrl, setRequestQrUrl] = useState<string>('');

  // Faucet state
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [fundingMsg, setFundingMsg] = useState<string>('');

  const address = activeAccount?.publicKey || '';

  // Generate Base Public Key QR Code
  useEffect(() => {
    if (!address) return;
    QRCode.toDataURL(address, {
      margin: 2,
      width: 260,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('QR code error', err));
  }, [address]);

  // Generate Payment URI: web+stellar:pay?destination=...&amount=...&asset_code=...
  const paymentUri = useMemo(() => {
    if (!address) return '';
    let uri = `web+stellar:pay?destination=${address}`;
    if (requestAmount && parseFloat(requestAmount) > 0) {
      uri += `&amount=${encodeURIComponent(requestAmount)}`;
    }
    if (requestAsset && requestAsset !== 'XLM') {
      uri += `&asset_code=${encodeURIComponent(requestAsset)}`;
    }
    if (requestMemo.trim()) {
      uri += `&memo=${encodeURIComponent(requestMemo.trim())}`;
    }
    return uri;
  }, [address, requestAmount, requestAsset, requestMemo]);

  // Generate Dynamic Payment Request QR Code
  useEffect(() => {
    if (!paymentUri) return;
    QRCode.toDataURL(paymentUri, {
      margin: 2,
      width: 220,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(setRequestQrUrl)
      .catch((err) => console.error('Request QR error', err));
  }, [paymentUri]);

  // Copy standard public key
  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Copy URI
  const handleCopyUri = () => {
    if (!paymentUri) return;
    navigator.clipboard.writeText(paymentUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  // Testnet Friendbot Faucet
  const handleFriendbotFund = async () => {
    if (!address || preferences.network !== 'testnet') return;
    setIsFunding(true);
    setFundingMsg('Contacting Stellar Testnet Friendbot...');
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`);
      if (res.ok) {
        setFundingMsg('✓ Received 10,000 Test XLM successfully!');
        setTimeout(() => setFundingMsg(''), 4000);
      } else {
        setFundingMsg(`Friendbot response: HTTP ${res.status}`);
      }
    } catch {
      setFundingMsg('Could not reach Friendbot service.');
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Receive Funds on Stellar
        </h2>
        <p className="text-muted" style={{ margin: 0, fontSize: '12.5px' }}>
          Share your public key or generate specialized payment request QR codes.
        </p>
      </div>

      {/* 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr', gap: '28px', alignItems: 'start' }}>
        {/* =========================================================================
            LEFT COLUMN: PRIMARY PUBLIC ADDRESS & QR
            ========================================================================= */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* QR Code Container with High-Res Frame */}
          <div
            style={{
              padding: '14px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
              display: 'inline-flex',
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Stellar Public Key QR Code"
                style={{ width: '230px', height: '230px', display: 'block' }}
              />
            ) : (
              <div style={{ width: '230px', height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={24} className="spin" />
              </div>
            )}
          </div>

          {/* Account Label & Badges */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>{activeAccount?.name || 'Main Account'}</span>
              <span className="badge badge-accent" style={{ fontSize: '10px' }}>
                {activeAccount?.type === 'passkey' ? 'Smart Account' : activeAccount?.type === 'ledger' ? 'Ledger HW' : 'Standard'}
              </span>
            </div>
            <div className="text-tertiary" style={{ fontSize: '11.5px' }}>
              Compatible with all Stellar DEX tokens and Horizon wallets
            </div>
          </div>

          {/* Raw Address Box */}
          <div
            className="font-mono"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11.5px',
              wordBreak: 'break-all',
              lineHeight: 1.5,
              color: 'var(--text-primary)',
            }}
          >
            {address}
          </div>

          {/* Copy Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCopyAddress}
            style={{ width: '100%', padding: '12px', gap: '8px', fontSize: '13px' }}
          >
            {copiedAddress ? (
              <>
                <Check size={16} color="#ffffff" />
                <span>Address Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy Stellar Public Key</span>
              </>
            )}
          </button>

          {/* View on Explorer Link */}
          <a
            href={getExplorerUrl('account', address, preferences.network)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '11.5px', color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>View Account on StellarExpert Explorer</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: PAYMENT INVOICE GENERATOR & RESERVE INFO
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Payment Request Builder */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={18} color="var(--accent)" />
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 2px' }}>
                  Create Payment Request (SEP-0007 URI)
                </h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '11.5px' }}>
                  Encode an amount, token, and memo into a scannable QR code.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '14px' }}>
              {/* Asset Code */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Asset
                </label>
                <select
                  className="select"
                  value={requestAsset}
                  onChange={(e) => setRequestAsset(e.target.value)}
                  style={{ width: '100%', height: '36px', fontSize: '12.5px' }}
                >
                  <option value="XLM">XLM (Native)</option>
                  <option value="USDC">USDC (Circle)</option>
                  <option value="EURC">EURC (Circle)</option>
                  <option value="AQUA">AQUA (Aquarius)</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Requested Amount (Optional)
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 50.00"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  style={{ height: '36px', fontSize: '12.5px' }}
                />
              </div>
            </div>

            {/* Memo */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Required Memo (Optional)
              </label>
              <input
                type="text"
                className="input"
                placeholder="Reference memo text or invoice ID"
                value={requestMemo}
                onChange={(e) => setRequestMemo(e.target.value)}
                style={{ height: '36px', fontSize: '12.5px' }}
              />
            </div>

            {/* Generated URI and Copy Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <input
                type="text"
                className="input font-mono text-muted"
                readOnly
                value={paymentUri}
                style={{ fontSize: '11px', height: '34px', background: 'var(--bg-subtle)' }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyUri}
                style={{ gap: '6px', height: '34px', flexShrink: 0 }}
              >
                {copiedUri ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                <span>{copiedUri ? 'Copied' : 'Copy URI'}</span>
              </button>
            </div>

            {requestQrUrl && requestAmount && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: '4px' }}>
                <img src={requestQrUrl} alt="Request QR" style={{ width: '72px', height: '72px', background: '#fff', padding: '4px', borderRadius: '8px' }} />
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 700 }}>Scannable Invoice QR</div>
                  <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                    Requesting {requestAmount} {requestAsset}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Testnet Friendbot Faucet Banner (if on Testnet) */}
          {preferences.network === 'testnet' && (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-focus)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <Sparkles size={16} color="var(--accent)" />
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>Stellar Testnet Friendbot Faucet</span>
                </div>
                <div className="text-muted" style={{ fontSize: '11.5px' }}>
                  Request 10,000 free testnet XLM directly from the Stellar development faucet.
                </div>
                {fundingMsg && (
                  <div style={{ marginTop: '6px', fontSize: '11.5px', color: 'var(--accent)', fontWeight: 600 }}>
                    {fundingMsg}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFriendbotFund}
                disabled={isFunding}
                style={{ flexShrink: 0, gap: '6px' }}
              >
                {isFunding ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
                <span>Claim 10,000 XLM</span>
              </button>
            </div>
          )}

          {/* Stellar Ledger Reserve Protocol Card */}
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
              <ShieldCheck size={16} color="var(--accent)" />
              <span>Stellar Account Activation & Reserves</span>
            </div>

            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>
                <strong>Initial Activation:</strong> Unfunded accounts require at least <strong>1.0 XLM</strong> in their first incoming transfer to be created on the ledger.
              </li>
              <li>
                <strong>No Memo Needed for Personal Wallets:</strong> When sending to this Stellith account from personal self-custody wallets, no memo is required.
              </li>
              <li>
                <strong>Anchored Assets:</strong> To receive non-XLM tokens (like USDC or EURC), your account must first establish a trustline in the <strong>Assets</strong> tab.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
