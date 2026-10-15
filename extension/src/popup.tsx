import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { WalletRoot } from './components/WalletRoot';
import './styles/theme.css';
import './styles/components.css';

const PopupEntry: React.FC = () => {
  const { isReady, isInitialized } = useWallet();

  useEffect(() => {
    if (isReady && !isInitialized) {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        window.close();
      }
    }
  }, [isReady, isInitialized]);

  if (!isReady) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          width: '360px',
          background: 'var(--bg-app)',
        }}
      >
        <span className="text-xs text-muted">Loading TBD Wallet…</span>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          width: '360px',
          padding: '24px 20px',
          textAlign: 'center',
          background: 'var(--bg-app)',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700 }}>TBD</span>
          <span className="brand-badge">TBD</span>
        </div>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Create or Import Wallet</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          For your security and comfortable viewing of your 12-word recovery phrase, wallet creation opens in a full browser tab.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
              chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
              window.close();
            } else {
              window.open('/index.html', '_blank');
            }
          }}
          style={{ width: '100%', marginTop: '8px' }}
        >
          Open in Full Tab
        </button>
      </div>
    );
  }

  return <WalletRoot isPopup={true} />;
};

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ThemeProvider>
        <I18nProvider>
          <WalletProvider>
            <PopupEntry />
          </WalletProvider>
        </I18nProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}
