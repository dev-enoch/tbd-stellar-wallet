import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import {
  decodeTransactionXdr,
  signTransactionXdr,
  DecodedTransactionPreview,
} from '../../services/dappProvider';
import { ConnectRequestModal } from './ConnectRequestModal';
import { SignRequestModal } from './SignRequestModal';
import {
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Account,
} from '@stellar/stellar-sdk';
import { NETWORKS } from '../../services/stellar';
import { Code, CheckCircle, ShieldAlert, Play, X } from 'lucide-react';

export const DAppSandbox: React.FC = () => {
  const { activeAccount, preferences, updatePreferences } = useWallet();

  const [activeModal, setActiveModal] = useState<'none' | 'connect' | 'sign'>('none');
  const [currentOrigin, setCurrentOrigin] = useState('https://app.soroswap.finance');
  const [currentPreview, setCurrentPreview] = useState<DecodedTransactionPreview | null>(null);
  const [outputLog, setOutputLog] = useState<string>('Ready for simulation.');

  // Valid Stellar Ed25519 public key for simulation (USDC issuer on Stellar)
  const sampleDummyDestination = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

  const triggerConnect = () => {
    setCurrentOrigin('https://app.soroswap.finance');
    setActiveModal('connect');
    setOutputLog('Initiated Connect Request for https://app.soroswap.finance');
  };

  const triggerPaymentSign = () => {
    if (!activeAccount) {
      setOutputLog('Please unlock or select an active account first.');
      return;
    }
    try {
      const dummyAccount = new Account(activeAccount.publicKey, '100');
      const tx = new TransactionBuilder(dummyAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORKS[preferences.network].networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: sampleDummyDestination,
            asset: new Asset('USDC', sampleDummyDestination),
            amount: '75.50',
          })
        )
        .setTimeout(30)
        .build();

      const xdr = tx.toXDR();
      const preview = decodeTransactionXdr(xdr, activeAccount.publicKey, preferences.network);
      setCurrentOrigin('https://app.soroswap.finance');
      setCurrentPreview(preview);
      setActiveModal('sign');
      setOutputLog('Initiated Payment Sign request (75.50 USDC).');
    } catch (err: any) {
      setOutputLog(`Payment build failed: ${err.message}`);
    }
  };

  const triggerHighRiskSign = () => {
    if (!activeAccount) {
      setOutputLog('Please unlock or select an active account first.');
      return;
    }
    try {
      const dummyAccount = new Account(activeAccount.publicKey, '100');
      const tx = new TransactionBuilder(dummyAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORKS[preferences.network].networkPassphrase,
      })
        .addOperation(
          Operation.setOptions({
            signer: {
              ed25519PublicKey: sampleDummyDestination,
              weight: 10,
            },
          })
        )
        .setTimeout(30)
        .build();

      const xdr = tx.toXDR();
      const preview = decodeTransactionXdr(xdr, activeAccount.publicKey, preferences.network);
      setCurrentOrigin('https://unknown-dex-exploit.xyz');
      setCurrentPreview(preview);
      setActiveModal('sign');
      setOutputLog('Initiated High-Risk Security Settings Sign request.');
    } catch (err: any) {
      setOutputLog(`High-risk build failed: ${err.message}`);
    }
  };

  const handleApproveConnect = async (sharedKey: string) => {
    setActiveModal('none');
    const currentSites = preferences.connectedSites || [];
    const exists = currentSites.some((s) => s.origin === currentOrigin);
    if (!exists) {
      await updatePreferences({
        connectedSites: [
          ...currentSites,
          {
            origin: currentOrigin,
            connectedAt: Date.now(),
            accountPublicKey: sharedKey,
          },
        ],
      });
    }
    setOutputLog(`dApp connection approved for ${currentOrigin}. Shared address: ${sharedKey}`);
  };

  const handleApproveSign = async () => {
    if (!activeAccount || !currentPreview) return;
    try {
      let signedXdr: string;
      if (activeAccount.signer) {
        const passphrase = NETWORKS[preferences.network].networkPassphrase;
        signedXdr = await activeAccount.signer.signTransaction(currentPreview.rawXdr, passphrase);
      } else if (activeAccount.keypair) {
        signedXdr = signTransactionXdr(
          currentPreview.rawXdr,
          activeAccount.keypair,
          preferences.network
        );
      } else {
        throw new Error('No signing credentials available for active account');
      }
      setActiveModal('none');
      setOutputLog(`Transaction successfully signed! Signed XDR:\n${signedXdr}`);
    } catch (err: any) {
      setOutputLog(`Signing failed: ${err.message}`);
    }
  };

  return (
    <div className="panel" style={{ marginTop: '24px', background: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Code size={16} color="var(--accent)" />
        <h3 className="text-base" style={{ fontWeight: 600 }}>dApp Provider Test Harness</h3>
      </div>
      <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
        Simulate standard wallet connection and transaction signing prompts conforming to the Stellar Wallets Kit and Freighter API.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        <button className="btn btn-secondary btn-sm" onClick={triggerConnect}>
          <Play size={12} />
          <span>Test Connect Request</span>
        </button>

        <button className="btn btn-secondary btn-sm" onClick={triggerPaymentSign}>
          <CheckCircle size={12} color="var(--success)" />
          <span>Test Payment Sign (USDC)</span>
        </button>

        <button className="btn btn-secondary btn-sm" onClick={triggerHighRiskSign}>
          <ShieldAlert size={12} color="var(--danger)" />
          <span>Test High-Risk Sign (Signer Change)</span>
        </button>
      </div>

      <div className="panel-subtle">
        <div className="label" style={{ marginBottom: '4px' }}>Harness Output Log:</div>
        <pre
          className="font-mono text-xs"
          style={{
            maxHeight: '120px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            color: 'var(--text-secondary)',
          }}
        >
          {outputLog}
        </pre>
      </div>

      {/* Authentic Extension Popup Simulator (Connections & Confirmations) */}
      {activeModal !== 'none' && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '28px',
            width: '360px',
            height: '600px',
            background: 'var(--bg-primary)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Extension Window Chrome Titlebar */}
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  background: 'var(--accent)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 900,
                }}
              >
                S
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Stellith Extension • Approval</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => {
                const msg = activeModal === 'connect' ? 'Connect request canceled.' : 'Transaction request rejected.';
                setActiveModal('none');
                setOutputLog(msg);
              }}
              style={{ padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Popup Content */}
          <div style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
            {activeModal === 'connect' && (
              <ConnectRequestModal
                origin={currentOrigin}
                onApprove={handleApproveConnect}
                onReject={() => {
                  setActiveModal('none');
                  setOutputLog('Connect request was rejected by user.');
                }}
              />
            )}

            {activeModal === 'sign' && currentPreview && (
              <SignRequestModal
                origin={currentOrigin}
                preview={currentPreview}
                onApprove={handleApproveSign}
                onReject={() => {
                  setActiveModal('none');
                  setOutputLog('Transaction signing request was rejected by user.');
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
