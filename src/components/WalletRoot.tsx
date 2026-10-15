import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { WelcomeScreen } from './onboarding/WelcomeScreen';
import { CreateWalletScreen } from './onboarding/CreateWalletScreen';
import { ImportWalletScreen } from './onboarding/ImportWalletScreen';
import { UnlockScreen } from './auth/UnlockScreen';
import { HomeScreen } from './home/HomeScreen';
import { SendScreen } from './send/SendScreen';
import { ReceiveScreen } from './receive/ReceiveScreen';
import { ManageAssetsScreen } from './assets/ManageAssetsScreen';
import { AccountSelectorModal } from './account/AccountSelectorModal';
import { Sun, Moon, Globe, Lock } from 'lucide-react';

interface WalletRootProps {
  isPopup?: boolean;
}

export type WalletView = 'home' | 'send' | 'receive' | 'swap' | 'addAsset' | 'settings';

export const WalletRoot: React.FC<WalletRootProps> = ({ isPopup = false }) => {
  const { isInitialized, isLocked, createWallet, importWallet, importSecretKey, unlock, lock, resetWallet } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();

  const [onboardingView, setOnboardingView] = useState<'welcome' | 'create' | 'import'>('welcome');
  const [activeView, setActiveView] = useState<WalletView>('home');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const containerClass = isPopup ? 'popup-container' : 'popup-container';

  return (
    <div className={isPopup ? '' : 'wallet-shell'}>
      {!isPopup && (
        <header className="header" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="brand">
            <span style={{ fontSize: '18px', fontWeight: 700 }}>{t.appName}</span>
            <span className="brand-badge">{t.tbdBadge}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setLanguage(language === 'en' ? 'ha' : 'en')}
              title="Toggle English / Hausa"
            >
              <Globe size={14} />
              <span>{language.toUpperCase()}</span>
            </button>
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {!isLocked && isInitialized && (
              <button className="btn btn-secondary btn-sm" onClick={lock}>
                <Lock size={13} />
                <span>{t.lockWallet}</span>
              </button>
            )}
          </div>
        </header>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: isPopup ? '100%' : 'calc(100vh - 60px)', padding: isPopup ? '0' : '20px' }}>
        <div className={containerClass} style={{ height: '600px', borderRadius: isPopup ? 0 : 'var(--radius-lg)' }}>
          {/* Extension internal top header */}
          {isPopup && (
            <div className="header" style={{ padding: '8px 12px' }}>
              <div className="brand">
                <span>{t.appName}</span>
                <span className="brand-badge">{t.tbdBadge}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => setLanguage(language === 'en' ? 'ha' : 'en')}
                  title="Toggle Hausa/English"
                  style={{ fontSize: '11px', fontWeight: 600, padding: '4px 6px' }}
                >
                  {language.toUpperCase()}
                </button>
                <button className="btn btn-ghost btn-icon" onClick={toggleTheme} title="Toggle Theme">
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                {!isLocked && isInitialized && (
                  <button className="btn btn-ghost btn-icon" onClick={lock} title={t.lockWallet}>
                    <Lock size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Screen Routing */}
          {!isInitialized ? (
            <>
              {onboardingView === 'welcome' && (
                <WelcomeScreen
                  onCreate={() => setOnboardingView('create')}
                  onImport={() => setOnboardingView('import')}
                />
              )}
              {onboardingView === 'create' && (
                <CreateWalletScreen
                  onBack={() => setOnboardingView('welcome')}
                  onComplete={createWallet}
                />
              )}
              {onboardingView === 'import' && (
                <ImportWalletScreen
                  onBack={() => setOnboardingView('welcome')}
                  onImportMnemonic={importWallet}
                  onImportSecretKey={importSecretKey}
                />
              )}
            </>
          ) : isLocked ? (
            <UnlockScreen onUnlock={unlock} onReset={resetWallet} />
          ) : activeView === 'send' ? (
            <SendScreen
              onBack={() => setActiveView('home')}
              onSuccess={() => setActiveView('home')}
            />
          ) : activeView === 'receive' ? (
            <ReceiveScreen onBack={() => setActiveView('home')} />
          ) : activeView === 'addAsset' ? (
            <ManageAssetsScreen onBack={() => setActiveView('home')} />
          ) : (
            <HomeScreen
              onSend={() => setActiveView('send')}
              onReceive={() => setActiveView('receive')}
              onSwap={() => setActiveView('swap')}
              onAddAsset={() => setActiveView('addAsset')}
              onOpenAccountSelector={() => setIsAccountModalOpen(true)}
              onOpenSettings={() => setActiveView('settings')}
            />
          )}

          <AccountSelectorModal
            isOpen={isAccountModalOpen}
            onClose={() => setIsAccountModalOpen(false)}
          />
        </div>
      </div>
    </div>
  );
};
