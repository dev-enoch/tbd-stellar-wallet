import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getAccountBalances,
  fundWithFriendbot,
  formatAddress,
  AccountBalanceSummary,
} from '../../services/stellar';
import { calculatePortfolioTotal } from '../../services/history';
import {
  Send,
  Download,
  Repeat,
  PlusCircle,
  Copy,
  Check,
  ChevronDown,
  Info,
  RefreshCw,
  Sparkles,
  Clock,
  Settings as SettingsIcon,
  Home,
  MoreVertical,
  Sun,
  Moon,
  Globe,
  Lock,
  TrendingUp,
  Banknote,
  Fingerprint,
  Maximize2,
} from 'lucide-react';

interface HomeScreenProps {
  onSend: (code?: string) => void;
  onReceive: () => void;
  onSwap: () => void;
  onAddAsset: () => void;
  onSelectAsset?: (assetCode: string) => void;
  onOpenAccountSelector: () => void;
  onOpenActivity: () => void;
  onOpenSettings: () => void;
  onOpenDashboard: () => void;
  onOpenNfts?: () => void;
  onOpenRamp?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSend,
  onReceive,
  onSwap,
  onAddAsset,
  onSelectAsset,
  onOpenAccountSelector,
  onOpenActivity,
  onOpenSettings,
  onOpenDashboard,
  onOpenNfts,
  onOpenRamp: _onOpenRamp,
}) => {
  const { activeAccount, preferences, updatePreferences, lock } = useWallet();
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [showReserveInfo, setShowReserveInfo] = useState<boolean>(false);
  const [fundingMessage, setFundingMessage] = useState<string>('');

  const handleOpenDesktopTab = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
      window.close();
    } else {
      window.open('/index.html', '_blank');
    }
  };
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const portfolio = calculatePortfolioTotal(balances?.assets || [], preferences.currency);

  const loadBalances = useCallback(async () => {
    if (!activeAccount) return;
    setIsLoading(true);
    try {
      const summary = await getAccountBalances(activeAccount.publicKey, preferences.network);
      setBalances(summary);
    } catch {
      // Keep previous cache if error
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, preferences.network]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const handleCopy = () => {
    if (!activeAccount) return;
    navigator.clipboard.writeText(activeAccount.publicKey);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleFundFriendbot = async () => {
    if (!activeAccount) return;
    setIsFunding(true);
    setFundingMessage('');
    try {
      await fundWithFriendbot(activeAccount.publicKey);
      setFundingMessage('Friendbot sent 10,000 XLM! Updating balances...');
      setTimeout(async () => {
        await loadBalances();
        setIsFunding(false);
        setFundingMessage('');
      }, 3000);
    } catch (err: any) {
      setFundingMessage(`Funding failed: ${err.message || 'Error'}`);
      setIsFunding(false);
    }
  };

  const toggleNetwork = async () => {
    const nextNet = preferences.network === 'testnet' ? 'mainnet' : 'testnet';
    await updatePreferences({ network: nextNet });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Account & Network Selector Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}
      >
        {/* Account Selector Pill */}
        <button
          className="btn btn-ghost"
          onClick={onOpenAccountSelector}
          style={{ padding: '4px 8px', gap: '6px', fontWeight: 600, fontSize: '13px' }}
        >
          <span>{activeAccount?.name || 'Account'}</span>
          <ChevronDown size={14} color="var(--text-tertiary)" />
        </button>

        {/* Right Controls: Network Chip + 3 Vertical Dots Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }} ref={menuRef}>
          {/* Network Toggle Chip */}
          <button
            className={`badge ${preferences.network === 'testnet' ? 'badge-accent' : 'badge-success'}`}
            onClick={toggleNetwork}
            title="Click to switch network"
            style={{ cursor: 'pointer', padding: '3px 8px' }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: 'var(--radius-full)',
                background: preferences.network === 'testnet' ? 'var(--accent)' : 'var(--success)',
              }}
            />
            <span>{preferences.network === 'testnet' ? 'Testnet' : 'Mainnet'}</span>
          </button>

          {/* Open Desktop Tab Button */}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={handleOpenDesktopTab}
            title="Open Desktop Dashboard"
            style={{ padding: '4px', borderRadius: '6px', color: 'var(--text-secondary)' }}
          >
            <Maximize2 size={15} />
          </button>

          {/* 3 Vertical Dots Button */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="Options & Settings"
            style={{ padding: '4px', borderRadius: '6px', color: 'var(--text-secondary)' }}
          >
            <MoreVertical size={16} />
          </button>

          {/* Apple-Style Contextual Popover Dropdown */}
          {isMenuOpen && (
            <div className="popover-menu">
              <div className="popover-section-header">
                Stellar Network
              </div>

              {/* Testnet Option */}
              <div
                className={`popover-item ${preferences.network === 'testnet' ? 'active' : ''}`}
                onClick={async () => {
                  await updatePreferences({ network: 'testnet' });
                  setIsMenuOpen(false);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                  <span>Testnet</span>
                </div>
                {preferences.network === 'testnet' && <Check size={14} color="var(--accent)" />}
              </div>

              {/* Mainnet Option */}
              <div
                className={`popover-item ${preferences.network === 'mainnet' ? 'active' : ''}`}
                onClick={async () => {
                  await updatePreferences({ network: 'mainnet' });
                  setIsMenuOpen(false);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  <span>Mainnet</span>
                </div>
                {preferences.network === 'mainnet' && <Check size={14} color="var(--accent)" />}
              </div>

              <div className="popover-divider" />

              {/* Theme Toggle */}
              <div
                className="popover-item"
                onClick={() => {
                  toggleTheme();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
              </div>

              {/* Language Toggle */}
              <div
                className="popover-item"
                onClick={() => {
                  setLanguage(language === 'en' ? 'ha' : 'en');
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={14} />
                  <span>Language</span>
                </div>
                <span className="font-mono text-muted text-xs">{language.toUpperCase()}</span>
              </div>

              <div className="popover-divider" />

              {/* Portfolio Dashboard */}
              <div
                className="popover-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenDashboard();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={14} />
                  <span>Portfolio Dashboard</span>
                </div>
              </div>

              {/* Open Desktop Tab */}
              <div
                className="popover-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleOpenDesktopTab();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Maximize2 size={14} />
                  <span>Open Desktop Tab</span>
                </div>
              </div>

              {/* Naira Buy / Sell Ramp (Paused) */}
              <div
                className="popover-item"
                style={{ opacity: 0.45, cursor: 'not-allowed' }}
                title="Buy / Sell is paused pending regulatory licensing (Coming Soon)"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Banknote size={14} />
                  <span>Buy / Sell (Coming Soon)</span>
                </div>
              </div>

              {/* Settings */}
              <div
                className="popover-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenSettings();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SettingsIcon size={14} />
                  <span>{t.settingsTitle}</span>
                </div>
              </div>

              {/* Lock Wallet */}
              <div
                className="popover-item danger"
                onClick={() => {
                  setIsMenuOpen(false);
                  lock();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={14} />
                  <span>{t.lockWallet}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Shortened Address Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={handleCopy}
            className="badge"
            style={{ padding: '4px 10px', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
            title="Click to copy full public key"
          >
            {copiedAddress ? (
              <>
                <Check size={12} color="var(--success)" />
                <span style={{ color: 'var(--success)' }}>{t.copied}</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>{formatAddress(activeAccount?.publicKey || '', 5)}</span>
              </>
            )}
          </button>

          <button
            className="btn btn-ghost btn-icon"
            onClick={loadBalances}
            disabled={isLoading}
            title="Refresh balances"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Balance Card */}
        <div style={{ textAlign: 'center', padding: '12px 0 8px 0' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '4px' }}>
            {t.totalBalance}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em' }}>
            {balances ? portfolio.formatted : '—'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span
              className={`badge ${parseFloat(portfolio.totalChange24h) >= 0 ? 'badge-success' : 'badge-danger'}`}
              style={{ fontSize: '10px', fontWeight: 600 }}
            >
              {parseFloat(portfolio.totalChange24h) >= 0 ? '+' : ''}{portfolio.totalChange24h}%
            </span>
            <span className="text-xs text-muted font-mono">
              ({balances ? `${parseFloat(balances.totalXlm).toLocaleString()} XLM` : ''})
            </span>
          </div>

          {/* Spendable vs Reserved Breakdown */}
          {balances && balances.exists && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
              <span className="text-xs text-muted">
                {t.availableSpendable}: <strong style={{ color: 'var(--text-primary)' }}>{parseFloat(balances.spendableXlm).toLocaleString()} XLM</strong>
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => setShowReserveInfo(!showReserveInfo)}
                style={{ padding: '2px 4px', fontSize: '11px', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                <span>{parseFloat(balances.reservedXlm).toLocaleString()} reserved</span>
                <Info size={11} />
              </button>
            </div>
          )}

          {/* Plain Language Reserve Tooltip/Alert */}
          {showReserveInfo && balances && (
            <div className="panel-subtle" style={{ margin: '12px auto 0 auto', maxWidth: '320px', textAlign: 'left', fontSize: '12px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <Info size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontWeight: 500, marginBottom: '4px' }}>Stellar Minimum Reserve</p>
                  <p className="text-muted" style={{ lineHeight: 1.4 }}>{balances.reserveExplanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Dashboard link */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={onOpenDashboard}
            style={{
              margin: '8px auto 0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              padding: '2px 10px',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <TrendingUp size={12} />
            <span>Open PnL & Orders Dashboard</span>
          </button>
        </div>

        {/* Unfunded Account Banner with Friendbot */}
        {balances && !balances.exists && (
          <div className="panel" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{t.unfundedAccountTitle}</h4>
            <p className="text-muted text-xs" style={{ marginBottom: '12px' }}>{t.unfundedAccountDesc}</p>

            {preferences.network === 'testnet' ? (
              <button
                className="btn btn-accent btn-sm"
                onClick={handleFundFriendbot}
                disabled={isFunding}
                style={{ width: '100%', gap: '6px' }}
              >
                <Sparkles size={14} />
                <span>{isFunding ? 'Funding from Friendbot…' : t.fundWithFriendbot}</span>
              </button>
            ) : (
              <p className="text-xs text-tertiary">Send at least 1 XLM to this address to activate your account on Mainnet.</p>
            )}

            {fundingMessage && (
              <div className="text-xs text-muted" style={{ marginTop: '8px', textAlign: 'center' }}>
                {fundingMessage}
              </div>
            )}
          </div>
        )}

        {/* Passkey Smart Account Health & Sponsorship Strip */}
        {activeAccount?.type === 'passkey' && (
          <div
            className="panel-subtle"
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Fingerprint size={14} />
              <span>Smart Account · <strong>5/5 sponsored daily fees</strong></span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>No seed phrase needed</span>
          </div>
        )}

        {/* 4 Primary Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => onSend()} style={{ flexDirection: 'column', padding: '12px 6px', gap: '6px' }}>
            <Send size={18} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>{t.sendAction}</span>
          </button>
          <button className="btn btn-secondary" onClick={onReceive} style={{ flexDirection: 'column', padding: '12px 6px', gap: '6px' }}>
            <Download size={18} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>{t.receiveAction}</span>
          </button>
          <button className="btn btn-secondary" onClick={onSwap} style={{ flexDirection: 'column', padding: '12px 6px', gap: '6px' }}>
            <Repeat size={18} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>{t.swapAction}</span>
          </button>
          <button
            className="btn btn-secondary"
            disabled
            style={{
              flexDirection: 'column',
              padding: '12px 6px',
              gap: '6px',
              opacity: 0.45,
              cursor: 'not-allowed',
            }}
            title="Buy / Sell is paused pending regulatory licensing (Coming Soon)"
          >
            <Banknote size={18} />
            <span style={{ fontSize: '10px', fontWeight: 600 }}>Coming Soon</span>
          </button>
        </div>

        {/* Assets Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.assetsTitle} ({balances?.assets.length || 0})
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onAddAsset}
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
              title={t.addAssetAction}
            >
              <PlusCircle size={12} />
              <span>{t.addAssetAction}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {balances?.assets.map((asset) => (
              <div
                key={asset.code + (asset.issuer || '')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  cursor: onSelectAsset ? 'pointer' : 'default',
                  transition: 'background var(--transition-fast)',
                }}
                onClick={() => onSelectAsset && onSelectAsset(asset.code)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {asset.code.substring(0, 3)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{asset.code}</div>
                    <div className="text-tertiary" style={{ fontSize: '10px' }}>
                      {asset.isNative ? 'Native Stellar Token' : formatAddress(asset.issuer || '', 4)}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {parseFloat(asset.balance).toLocaleString()}
                  </div>
                  <div className="text-tertiary" style={{ fontSize: '11px' }}>
                    {asset.code}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Tabs - Pinned to bottom */}
      <div
        style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          padding: '4px 0',
        }}
      >
        <button
          className="btn btn-ghost"
          style={{ flexDirection: 'column', gap: '2px', fontSize: '10px', color: 'var(--accent)', fontWeight: 600, padding: '4px 0' }}
        >
          <Home size={15} />
          <span>Home</span>
        </button>
        <button
          className="btn btn-ghost"
          onClick={onAddAsset}
          style={{ flexDirection: 'column', gap: '2px', fontSize: '10px', color: 'var(--text-secondary)', padding: '4px 0' }}
        >
          <PlusCircle size={15} />
          <span>Assets</span>
        </button>
        <button
          className="btn btn-ghost"
          onClick={onOpenNfts}
          style={{ flexDirection: 'column', gap: '2px', fontSize: '10px', color: 'var(--text-secondary)', padding: '4px 0' }}
        >
          <Sparkles size={15} />
          <span>NFTs</span>
        </button>
        <button
          className="btn btn-ghost"
          onClick={onOpenActivity}
          style={{ flexDirection: 'column', gap: '2px', fontSize: '10px', color: 'var(--text-secondary)', padding: '4px 0' }}
        >
          <Clock size={15} />
          <span>Activity</span>
        </button>
      </div>
    </div>
  );
};
