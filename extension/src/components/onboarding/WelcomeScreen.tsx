import React, { useState } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Shield, ChevronDown, ChevronUp, ExternalLink, ArrowRight, Download } from 'lucide-react';

interface WelcomeScreenProps {
  onCreate: () => void;
  onImport: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onCreate, onImport }) => {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '24px 20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <img
            src="/Stellith_logo.jpg"
            alt="Stellith Logo"
            style={{
              width: '26px',
              height: '26px',
              objectFit: 'contain',
              borderRadius: '4px',
              filter: theme === 'dark' ? 'invert(1)' : 'none',
            }}
          />
          <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em' }}>{t.appName}</span>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: '12px' }}>
          {t.welcomeTitle}
        </h1>
        <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '24px' }}>
          {t.welcomeSubtitle}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <button className="btn btn-primary btn-lg" onClick={onCreate}>
            <span>{t.createWalletBtn}</span>
            <ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onImport}>
            <Download size={16} />
            <span>{t.importWalletBtn}</span>
          </button>
        </div>

        {/* Technical Explainer Panel */}
        <div className="panel-subtle" style={{ marginTop: '12px' }}>
          <button
            onClick={() => setShowSecurityInfo(!showSecurityInfo)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} color="var(--accent)" />
              <span>{t.howKeysStored}</span>
            </div>
            {showSecurityInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showSecurityInfo && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <p>{t.howKeysStoredDesc}</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <a
          href="https://github.com/dev-enoch/tbd-stellar-wallet"
          target="_blank"
          rel="noreferrer"
          className="text-tertiary"
          style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <span>{t.openSourceNotice}</span>
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
};
