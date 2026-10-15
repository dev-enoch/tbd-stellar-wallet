import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { WelcomeScreen } from './onboarding/WelcomeScreen';
import { CreateWalletScreen } from './onboarding/CreateWalletScreen';
import { ImportWalletScreen } from './onboarding/ImportWalletScreen';
import { UnlockScreen } from './auth/UnlockScreen';
import { HomeScreen } from './home/HomeScreen';
import { SendScreen } from './send/SendScreen';
import { ReceiveScreen } from './receive/ReceiveScreen';
import { ManageAssetsScreen } from './assets/ManageAssetsScreen';
import { SwapScreen } from './swap/SwapScreen';
import { HistoryScreen } from './history/HistoryScreen';
import { AssetDetailScreen } from './portfolio/AssetDetailScreen';
import { SettingsScreen } from './settings/SettingsScreen';
import { DAppSandbox } from './dapp/DAppSandbox';
import { AccountSelectorModal } from './account/AccountSelectorModal';
import { DashboardView } from './dashboard/DashboardView';

interface WalletRootProps {
  isPopup?: boolean;
}

export type WalletView =
  | 'home'
  | 'send'
  | 'receive'
  | 'swap'
  | 'addAsset'
  | 'history'
  | 'assetDetail'
  | 'settings'
  | 'dashboard';

export const WalletRoot: React.FC<WalletRootProps> = ({ isPopup = false }) => {
  const { isInitialized, isLocked, createWallet, importWallet, importSecretKey, unlock, resetWallet } = useWallet();

  const [onboardingView, setOnboardingView] = useState<'welcome' | 'create' | 'import'>('welcome');
  const [activeView, setActiveView] = useState<WalletView>('home');
  const [selectedAssetCode, setSelectedAssetCode] = useState<string>('XLM');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const containerClass = isPopup ? 'popup-container' : 'popup-container';

  return (
    <div className={isPopup ? '' : 'wallet-shell'}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: isPopup ? 'center' : 'flex-start', flexWrap: 'wrap', gap: '32px', minHeight: isPopup ? '100%' : '100vh', padding: isPopup ? '0' : '32px 20px' }}>
        <div className={containerClass} style={{ height: '600px', borderRadius: isPopup ? 0 : 'var(--radius-lg)' }}>

          {/* Screen Routing Content Area */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
            ) : activeView === 'swap' ? (
              <SwapScreen
                onBack={() => setActiveView('home')}
                onSuccess={() => setActiveView('home')}
              />
            ) : activeView === 'history' ? (
              <HistoryScreen onBack={() => setActiveView('home')} />
            ) : activeView === 'assetDetail' ? (
              <AssetDetailScreen
                assetCode={selectedAssetCode}
                onBack={() => setActiveView('home')}
                onSendAsset={(_code) => setActiveView('send')}
                onSwapAsset={(_code) => setActiveView('swap')}
              />
            ) : activeView === 'settings' ? (
              <SettingsScreen onBack={() => setActiveView('home')} />
            ) : activeView === 'dashboard' ? (
              <DashboardView onBack={() => setActiveView('home')} isFullTab={!isPopup} />
            ) : (
              <HomeScreen
                onSend={() => setActiveView('send')}
                onReceive={() => setActiveView('receive')}
                onSwap={() => setActiveView('swap')}
                onAddAsset={() => setActiveView('addAsset')}
                onSelectAsset={(code) => {
                  setSelectedAssetCode(code);
                  setActiveView('assetDetail');
                }}
                onOpenAccountSelector={() => setIsAccountModalOpen(true)}
                onOpenActivity={() => setActiveView('history')}
                onOpenSettings={() => setActiveView('settings')}
                onOpenDashboard={() => setActiveView('dashboard')}
              />
            )}
          </div>

          <AccountSelectorModal
            isOpen={isAccountModalOpen}
            onClose={() => setIsAccountModalOpen(false)}
          />
        </div>

        {!isPopup && (
          <div style={{ flex: 1, maxWidth: '640px', width: '100%' }}>
            <DAppSandbox />
          </div>
        )}
      </div>
    </div>
  );
};
