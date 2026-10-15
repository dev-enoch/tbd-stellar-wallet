import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider, useI18n } from './contexts/I18nContext';
import './styles/theme.css';
import './styles/components.css';

const App: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="wallet-shell">
      <header className="header">
        <div className="brand">
          <span>{t.appName}</span>
          <span className="brand-badge">{t.tbdBadge}</span>
        </div>
      </header>
      <main style={{ padding: '24px' }}>
        <h1 className="text-xl">{t.welcomeTitle}</h1>
        <p className="text-muted" style={{ marginTop: '8px' }}>{t.welcomeSubtitle}</p>
      </main>
    </div>
  );
};

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ThemeProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}
