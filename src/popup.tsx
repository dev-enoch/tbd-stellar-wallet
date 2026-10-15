import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider, useI18n } from './contexts/I18nContext';
import './styles/theme.css';
import './styles/components.css';

const PopupApp: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="popup-container">
      <header className="header">
        <div className="brand">
          <span>{t.appName}</span>
          <span className="brand-badge">{t.tbdBadge}</span>
        </div>
      </header>
      <main style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        <h2 className="text-lg">{t.welcomeTitle}</h2>
        <p className="text-muted" style={{ marginTop: '6px' }}>{t.welcomeSubtitle}</p>
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
          <PopupApp />
        </I18nProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}
