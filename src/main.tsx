import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { WalletProvider } from './contexts/WalletContext';
import { WalletRoot } from './components/WalletRoot';
import './styles/theme.css';
import './styles/components.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ThemeProvider>
        <I18nProvider>
          <WalletProvider>
            <WalletRoot isPopup={false} />
          </WalletProvider>
        </I18nProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}
