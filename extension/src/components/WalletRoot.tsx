import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { storage } from '../services/storage';
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
import { AccountSelectorModal } from './account/AccountSelectorModal';
import { DashboardView } from './dashboard/DashboardView';
import { RampScreen } from './ramp/RampScreen';
import { NftGalleryScreen } from './nft/NftGalleryScreen';
import { DesktopShell } from './desktop/DesktopShell';
import { DesktopOnboarding } from './desktop/DesktopOnboarding';
import { DesktopUnlock } from './desktop/DesktopUnlock';

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
  | 'dashboard'
  | 'ramp'
  | 'nfts';

export const WalletRoot: React.FC<WalletRootProps> = ({ isPopup = false }) => {
  const {
    isInitialized,
    isLocked,
    createWallet,
    importWallet,
    importSecretKey,
    unlock,
    resetWallet,
  } = useWallet();

  const [onboardingView, setOnboardingView] = useState<'welcome' | 'create' | 'import'>('welcome');
  const [activeView, setActiveView] = useState<WalletView>('home');
  const [selectedAssetCode, setSelectedAssetCode] = useState<string>('XLM');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Restore in-progress send draft if popup was exited and reopened within 30 minutes while unlocked
  useEffect(() => {
    if (isPopup && isInitialized && !isLocked) {
      storage.getSendDraft().then((draft) => {
        if (draft && Date.now() - draft.updatedAt < 30 * 60 * 1000) {
          setSelectedAssetCode(draft.assetCode || 'XLM');
          setActiveView('send');
        }
      });
    }
  }, [isPopup, isInitialized, isLocked]);

  const handleReturnHome = () => {
    setActiveView('home');
    storage.clearSendDraft();
    storage.setLastActiveView('home');
  };

  // 1. FULL DESKTOP BROWSER TAB MODE (index.html)
  if (!isPopup) {
    if (!isInitialized) {
      return (
        <DesktopOnboarding
          onCreateComplete={createWallet}
          onImportMnemonic={importWallet}
          onImportSecretKey={importSecretKey}
        />
      );
    }

    if (isLocked) {
      return <DesktopUnlock onUnlock={unlock} onReset={resetWallet} />;
    }

    return <DesktopShell />;
  }

  // 2. COMPACT EXTENSION POPUP MODE (popup.html)
  return (
    <div className="popup-container" style={{ height: '600px', width: '360px' }}>
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
            initialAssetCode={selectedAssetCode}
            onBack={handleReturnHome}
            onSuccess={handleReturnHome}
          />
        ) : activeView === 'receive' ? (
          <ReceiveScreen onBack={() => setActiveView('home')} />
        ) : activeView === 'addAsset' ? (
          <ManageAssetsScreen onBack={() => setActiveView('home')} />
        ) : activeView === 'swap' ? (
          <SwapScreen
            initialFromAssetCode={selectedAssetCode}
            onBack={() => setActiveView('home')}
            onSuccess={() => setActiveView('home')}
          />
        ) : activeView === 'history' ? (
          <HistoryScreen onBack={() => setActiveView('home')} />
        ) : activeView === 'assetDetail' ? (
          <AssetDetailScreen
            assetCode={selectedAssetCode}
            onBack={() => setActiveView('home')}
            onSendAsset={(code) => {
              setSelectedAssetCode(code);
              setActiveView('send');
            }}
            onSwapAsset={(code) => {
              setSelectedAssetCode(code);
              setActiveView('swap');
            }}
          />
        ) : activeView === 'settings' ? (
          <SettingsScreen onBack={() => setActiveView('home')} />
        ) : activeView === 'dashboard' ? (
          <DashboardView onBack={() => setActiveView('home')} isFullTab={false} />
        ) : activeView === 'nfts' ? (
          <NftGalleryScreen onBack={handleReturnHome} />
        ) : activeView === 'ramp' ? (
          <RampScreen
            onBack={() => setActiveView('home')}
            onSuccess={() => setActiveView('home')}
          />
        ) : (
          <HomeScreen
            onSend={(code?: string) => {
              setSelectedAssetCode(code || 'XLM');
              setActiveView('send');
            }}
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
            onOpenNfts={() => setActiveView('nfts')}
          />
        )}
      </div>

      <AccountSelectorModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </div>
  );
};
