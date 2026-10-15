import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import {
  connectLedger,
  verifyAddressOnDevice,
  deriveDeterministicLedgerPubkey,
  getStellarBip44Path,
  LedgerDeviceInfo,
  LedgerError,
} from '../../services/ledger';
import { formatAddress } from '../../services/stellar';
import { X, Cpu, Check, AlertCircle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

interface LedgerConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'connect' | 'select_account' | 'verify_address' | 'success';

export const LedgerConnectModal: React.FC<LedgerConnectModalProps> = ({ isOpen, onClose }) => {
  const { addLedgerAccount } = useWallet();

  const [step, setStep] = useState<Step>('connect');
  const [deviceInfo, setDeviceInfo] = useState<LedgerDeviceInfo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [accountName, setAccountName] = useState<string>('Ledger Account 1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentBipPath = getStellarBip44Path(selectedIndex);
  const derivedPublicKey = deriveDeterministicLedgerPubkey(selectedIndex);

  const handleConnect = async () => {
    setIsLoading(true);
    setError('');
    try {
      const dev = await connectLedger();
      setDeviceInfo(dev);
      setStep('select_account');
    } catch (err: any) {
      if (err instanceof LedgerError) {
        setError(err.message);
      } else {
        setError(err.message || 'Could not connect to Ledger hardware wallet.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToVerify = () => {
    setStep('verify_address');
  };

  const handleVerifyOnDevice = async () => {
    setIsVerifying(true);
    setError('');
    try {
      await verifyAddressOnDevice(currentBipPath, derivedPublicKey);
      // Address verified, add to wallet
      await addLedgerAccount(
        derivedPublicKey,
        currentBipPath,
        accountName.trim() || `Ledger Account ${selectedIndex + 1}`
      );
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Address verification failed on device.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinish = () => {
    setStep('connect');
    setDeviceInfo(null);
    setSelectedIndex(0);
    setError('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-subtle)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          padding: '20px 16px',
          maxHeight: '90%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-md)',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Connect Ledger Hardware</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleFinish} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '12px', lineHeight: 1.4 }}>{error}</span>
          </div>
        )}

        {/* Step 1: Connect */}
        {step === 'connect' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Before connecting:</span>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Plug your Ledger into your computer with USB.</li>
                <li>Enter your PIN to unlock the device.</li>
                <li>Open the <strong>Stellar</strong> app on your Ledger screen.</li>
              </ul>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
              Your private keys never leave the Ledger device. Stellith connects over WebHID to request address verification and on-device transaction approvals.
            </div>

            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={isLoading}
              style={{ width: '100%', marginTop: '6px' }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Cpu size={14} />
                  <span>Connect Ledger</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Select Account / Derivation Path */}
        {step === 'select_account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {deviceInfo && (
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}
              >
                Connected: <strong>{deviceInfo.productName}</strong> (App v{deviceInfo.appVersion})
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Account Name
              </label>
              <input
                type="text"
                className="input"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ledger Account 1"
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Select Derivation Index (BIP-44)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[0, 1, 2].map((idx) => {
                  const path = getStellarBip44Path(idx);
                  const pubkey = deriveDeterministicLedgerPubkey(idx);
                  const isSelected = selectedIndex === idx;

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                        border: `1px solid ${isSelected ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onClick={() => {
                        setSelectedIndex(idx);
                        setAccountName(`Ledger Account ${idx + 1}`);
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '12px' }}>Index #{idx}</span>
                          <span className="font-mono text-muted" style={{ fontSize: '10px' }}>
                            {path}
                          </span>
                        </div>
                        <div className="font-mono text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                          {formatAddress(pubkey, 8)}
                        </div>
                      </div>
                      {isSelected && <Check size={16} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleProceedToVerify}
              style={{ width: '100%', marginTop: '4px' }}
            >
              <span>Next: Verify Address on Device</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Step 3: Verify on Device */}
        {step === 'verify_address' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Verify that the address shown on your Ledger device screen matches:
              </span>
              <div
                className="font-mono"
                style={{
                  padding: '8px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                }}
              >
                {derivedPublicKey}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                Path: {currentBipPath}
              </span>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleVerifyOnDevice}
              disabled={isVerifying}
              style={{ width: '100%' }}
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Check Device Screen...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Verify on Device & Import</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
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
              <Check size={22} />
            </div>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>Ledger Account Added</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                {accountName} is ready for secure on-device signing.
              </p>
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textAlign: 'left',
                lineHeight: 1.4,
              }}
            >
              <strong>Security Note:</strong> Classic payments & DEX offers can be reviewed on your Ledger screen. Soroban contract blind signing is disabled by default.
            </div>

            <button className="btn btn-primary" onClick={handleFinish} style={{ width: '100%' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
