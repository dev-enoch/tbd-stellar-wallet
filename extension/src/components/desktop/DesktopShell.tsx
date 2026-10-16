import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getAccountBalances,
  AccountBalanceSummary,
  formatAddress,
  getExplorerUrl,
} from '../../services/stellar';
import {
  getAccountActivity,
  ActivityItem,
  calculatePortfolioTotal,
} from '../../services/history';
import { fetchLiveMarketPrices } from '../../services/market';
import { PriceChart } from '../common/PriceChart';
import { DesktopAssets } from './DesktopAssets';
import { DesktopSwap } from './DesktopSwap';
import { DesktopSend } from './DesktopSend';
import { DesktopReceive } from './DesktopReceive';
import { DesktopActivity } from './DesktopActivity';
import { DesktopSettings } from './DesktopSettings';
import { DAppSandbox } from '../dapp/DAppSandbox';
import { NftGalleryScreen } from '../nft/NftGalleryScreen';
import { MarketTerminalScreen } from '../market/MarketTerminalScreen';
import { PerpsScreen } from '../perps/PerpsScreen';
import { AccountSelectorModal } from '../account/AccountSelectorModal';
import {
  PieChart,
  Coins,
  Repeat,
  Send,
  Download,
  CandlestickChart,
  Zap,
  Sparkles,
  Clock,
  Code2,
  Settings,
  Sun,
  Moon,
  Lock,
  Copy,
  Check,
  Info,
  PlusCircle,
} from 'lucide-react';

export type DesktopTab =
  | 'portfolio'
  | 'assets'
  | 'swap'
  | 'send'
  | 'receive'
  | 'market'
  | 'perps'
  | 'nfts'
  | 'activity'
  | 'dapp'
  | 'settings';

interface NavItem {
  id: DesktopTab;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const DesktopShell: React.FC = () => {
  const {
    activeAccount,
    preferences,
    updatePreferences,
    lock,
  } = useWallet();
  const { theme, toggleTheme } = useTheme();

  // Active Tab Navigation
  const [activeTab, setActiveTab] = useState<DesktopTab>('portfolio');
  const [transferAssetCode, setTransferAssetCode] = useState<string>('XLM');

  // Data State
  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [fundingMessage, setFundingMessage] = useState<string>('');

  // UI State
  const [chartAsset, setChartAsset] = useState<string>('XLM');
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [showReserveInfo, setShowReserveInfo] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);

  // Load all live on-chain and market data
  const refreshData = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const [bal, act] = await Promise.all([
        getAccountBalances(activeAccount.publicKey, preferences.network),
        getAccountActivity(activeAccount.publicKey, preferences.network),
        fetchLiveMarketPrices(),
      ]);
      setBalances(bal);
      setActivity(act);
    } catch (err) {
      console.warn('Desktop data refresh error:', err);
    }
  }, [activeAccount, preferences.network]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Copy address to clipboard
  const handleCopyAddress = () => {
    if (!activeAccount) return;
    navigator.clipboard.writeText(activeAccount.publicKey);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Fund with Friendbot (Testnet)
  const handleFundFriendbot = async () => {
    if (!activeAccount || preferences.network !== 'testnet') return;
    setIsFunding(true);
    setFundingMessage('Requesting 10,000 XLM from Stellar Testnet Friendbot…');
    try {
      const res = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(activeAccount.publicKey)}`
      );
      if (res.ok) {
        setFundingMessage('✓ Account successfully funded with 10,000 test XLM!');
        setTimeout(() => {
          setFundingMessage('');
          refreshData();
        }, 1500);
      } else {
        setFundingMessage('Friendbot request returned status ' + res.status);
      }
    } catch {
      setFundingMessage('Friendbot request failed. Try again in a few moments.');
    } finally {
      setIsFunding(false);
    }
  };

  // Switch navigation seamlessly without modals
  const handleOpenSend = (code?: string) => {
    setTransferAssetCode(code || 'XLM');
    setActiveTab('send');
  };

  const handleOpenSwap = (code?: string) => {
    setTransferAssetCode(code || 'XLM');
    setActiveTab('swap');
  };

  // Total Portfolio metrics
  const portfolioSummary = useMemo(() => {
    return calculatePortfolioTotal(balances?.assets || [], preferences.currency);
  }, [balances, preferences.currency]);

  // Navigation Items Definitions
  const NAV_SECTIONS: NavSection[] = [
    {
      title: 'PORTFOLIO & CORE',
      items: [
        { id: 'portfolio' as DesktopTab, label: 'Portfolio', icon: <PieChart size={16} /> },
        { id: 'assets' as DesktopTab, label: 'Assets & Trustlines', icon: <Coins size={16} /> },
        { id: 'swap' as DesktopTab, label: 'Trade / Swap', icon: <Repeat size={16} /> },
        { id: 'send' as DesktopTab, label: 'Send Payment', icon: <Send size={16} /> },
        { id: 'receive' as DesktopTab, label: 'Receive Funds', icon: <Download size={16} /> },
      ],
    },
    {
      title: 'TRADING & DEX',
      items: [
        { id: 'market' as DesktopTab, label: 'Market Terminal', icon: <CandlestickChart size={16} />, badge: 'SOON', badgeColor: 'badge-accent' },
        { id: 'perps' as DesktopTab, label: 'Perpetuals', icon: <Zap size={16} />, badge: 'SOON', badgeColor: 'badge-warning' },
      ],
    },
    {
      title: 'COLLECTIBLES',
      items: [
        { id: 'nfts' as DesktopTab, label: 'NFTs & Art', icon: <Sparkles size={16} />, badge: 'SEP-27', badgeColor: 'badge-info' },
      ],
    },
    {
      title: 'LEDGER & SYSTEM',
      items: [
        { id: 'activity' as DesktopTab, label: 'Activity Ledger', icon: <Clock size={16} /> },
        { id: 'dapp' as DesktopTab, label: 'dApp Sandbox', icon: <Code2 size={16} />, badge: 'DEV' },
        { id: 'settings' as DesktopTab, label: 'Settings', icon: <Settings size={16} /> },
      ],
    },
  ];

  // Helper for tab headers
  const getTabTitle = (tab: DesktopTab) => {
    switch (tab) {
      case 'portfolio':
        return 'Portfolio Overview';
      case 'assets':
        return 'Manage Assets & Trustlines';
      case 'swap':
        return 'Stellar DEX Swap';
      case 'send':
        return 'Send On-Chain Payment';
      case 'receive':
        return 'Receive Stellar Assets';
      case 'market':
        return 'DEX Market Terminal';
      case 'perps':
        return 'Stellar Perpetual Futures';
      case 'nfts':
        return 'Digital Collectibles & NFTs';
      case 'activity':
        return 'Transaction Ledger & History';
      case 'dapp':
        return 'Developer dApp Sandbox';
      case 'settings':
        return 'Wallet Settings & Security';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {/* =========================================================================
          1. PERSISTENT DESKTOP SIDE NAVIGATION BAR
          ========================================================================= */}
      <aside
        style={{
          width: '260px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '20px 20px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
              }}
            >
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                STELLITH
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.04em', fontWeight: 600 }}>
                STELLAR WALLET
              </div>
            </div>
          </div>
          <span className="badge badge-accent" style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px' }}>
            PRO
          </span>
        </div>

        {/* Scrollable Navigation List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  padding: '0 10px 6px',
                  letterSpacing: '0.05em',
                }}
              >
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12.5px',
                        fontWeight: isActive ? 700 : 500,
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        background: isActive ? 'var(--accent-subtle)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                        transition: 'all var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--bg-hover)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: isActive ? 'var(--accent)' : 'currentColor', display: 'flex' }}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`badge ${item.badgeColor || ''}`}
                          style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px' }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Profile / Account Pill */}
        <div
          style={{
            padding: '14px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          {activeAccount && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                onClick={() => setIsAccountModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: 0 }}
                title="Click to Switch Accounts"
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {activeAccount.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {activeAccount.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {formatAddress(activeAccount.publicKey, 3)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={handleCopyAddress}
                title="Copy Stellar Address"
                style={{ padding: '4px', flexShrink: 0 }}
              >
                {copiedAddress ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CONTENT WORKSPACE (Pure Desktop, No Modals)
          ========================================================================= */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top Control Bar */}
        <header
          style={{
            height: '56px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb / Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>
              {getTabTitle(activeTab)}
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>•</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Stellar {preferences.network.toUpperCase()}
            </span>
          </div>

          {/* Right Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Friendbot Claim Button if Testnet */}
            {preferences.network === 'testnet' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleFundFriendbot}
                disabled={isFunding}
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={12} color="var(--accent)" />
                <span>{isFunding ? 'Funding…' : 'Claim 10,000 XLM'}</span>
              </button>
            )}

            {/* Network Selector Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                className="select"
                value={preferences.network}
                onChange={async (e) => {
                  await updatePreferences({ network: e.target.value as any });
                }}
                style={{
                  height: '32px',
                  padding: '2px 8px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <option value="testnet">Testnet</option>
                <option value="mainnet">Mainnet</option>
                <option value="futurenet">Futurenet</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Lock Wallet Button */}
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={lock}
              title="Lock Wallet"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <Lock size={15} />
            </button>
          </div>
        </header>

        {/* Viewport Canvas (Modals Eliminated - Native Desktop Views) */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            background: 'var(--bg-primary)',
          }}
        >
          {/* Unfunded Testnet Notice */}
          {balances && !balances.exists && preferences.network === 'testnet' && activeTab === 'portfolio' && (
            <div
              style={{
                margin: '20px 28px 0',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-focus)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>
                  Unfunded Stellar Testnet Account
                </h4>
                <p className="text-muted text-xs" style={{ margin: 0 }}>
                  This account has not yet been initialized on the Stellar ledger. Click below to claim free testnet XLM.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-accent"
                onClick={handleFundFriendbot}
                disabled={isFunding}
                style={{ gap: '6px' }}
              >
                <Sparkles size={14} />
                <span>{isFunding ? 'Funding from Friendbot…' : 'Fund with 10,000 XLM'}</span>
              </button>
            </div>
          )}

          {fundingMessage && (
            <div className="text-xs text-muted" style={{ textAlign: 'center', padding: '8px' }}>
              {fundingMessage}
            </div>
          )}

          {/* =========================================================================
              VIEW 1: PORTFOLIO DASHBOARD
              ========================================================================= */}
          {activeTab === 'portfolio' && (
            <div
              style={{
                maxWidth: '1360px',
                width: '100%',
                margin: '0 auto',
                padding: '24px 28px 48px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
              }}
            >
              {/* Row 1: Net Worth Card & Interactive Real Chart */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px' }}>
                {/* Net Worth Card */}
                <div
                  className="panel"
                  style={{
                    padding: '24px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Total Net Worth
                      </span>
                      <span
                        className={`badge ${parseFloat(portfolioSummary.totalChange24h) >= 0 ? 'badge-success' : 'badge-danger'}`}
                        style={{ fontSize: '11px', fontWeight: 700 }}
                      >
                        {parseFloat(portfolioSummary.totalChange24h) >= 0 ? '+' : ''}
                        {portfolioSummary.totalChange24h}% (24h)
                      </span>
                    </div>

                    <div style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-0.03em', margin: '12px 0 6px 0' }}>
                      {portfolioSummary.formatted}
                    </div>

                    {/* Spendable vs Reserved Breakdown */}
                    {balances && balances.exists && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                        <span className="text-xs text-muted">
                          Spendable: <strong style={{ color: 'var(--text-primary)' }}>{parseFloat(balances.spendableXlm).toLocaleString()} XLM</strong>
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setShowReserveInfo(!showReserveInfo)}
                          style={{ padding: '2px 6px', fontSize: '11px', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <span>{parseFloat(balances.reservedXlm).toLocaleString()} reserved</span>
                          <Info size={11} />
                        </button>
                      </div>
                    )}

                    {showReserveInfo && balances && (
                      <div className="panel-subtle" style={{ margin: '12px 0 0 0', fontSize: '12px', padding: '10px 12px' }}>
                        <p style={{ fontWeight: 600, marginBottom: '2px' }}>Stellar Minimum Reserve</p>
                        <p className="text-muted" style={{ lineHeight: 1.4, margin: 0 }}>
                          {balances.reserveExplanation}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Navigation Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '24px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleOpenSend('XLM')}
                      style={{ flexDirection: 'column', padding: '14px 8px', gap: '6px' }}
                    >
                      <Send size={18} />
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>Send</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('receive')}
                      style={{ flexDirection: 'column', padding: '14px 8px', gap: '6px' }}
                    >
                      <Download size={18} />
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>Receive</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenSwap('XLM')}
                      style={{ flexDirection: 'column', padding: '14px 8px', gap: '6px' }}
                    >
                      <Repeat size={18} />
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>Swap</span>
                    </button>
                  </div>
                </div>

                {/* Card 2: Interactive Real Market Chart */}
                <div
                  className="panel"
                  style={{
                    padding: '24px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Asset Selector Tabs above Chart */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['XLM', 'USDC', 'EURC', 'AQUA'].map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setChartAsset(code)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: chartAsset === code ? 700 : 500,
                            borderRadius: 'var(--radius-full)',
                            border: chartAsset === code ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                            background: chartAsset === code ? 'var(--bg-subtle)' : 'transparent',
                            color: chartAsset === code ? 'var(--text-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SVG Live Price Chart */}
                  <PriceChart
                    assetCode={chartAsset}
                    currency={preferences.currency}
                    height={195}
                    showTimeframes={true}
                    interactive={true}
                  />
                </div>
              </div>

              {/* Row 2: Assets & Holdings Table + Recent Activity Preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '20px' }}>
                {/* Tokens & Assets Table */}
                <div
                  className="panel"
                  style={{
                    padding: '20px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 2px' }}>
                        Token Assets & Balances
                      </h3>
                      <span className="text-muted text-xs">
                        {balances?.assets.length || 0} Assets on Stellar Ledger
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('assets')}
                      style={{ fontSize: '11px', gap: '4px' }}
                    >
                      <PlusCircle size={13} />
                      <span>Manage All</span>
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
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-focus)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 800,
                            }}
                          >
                            {asset.code.substring(0, 3)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{asset.code}</div>
                            <div className="text-tertiary" style={{ fontSize: '11px' }}>
                              {asset.isNative ? 'Native Stellar Token' : formatAddress(asset.issuer || '', 4)}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>
                              {parseFloat(asset.balance).toLocaleString()}
                            </div>
                            <div className="text-tertiary" style={{ fontSize: '11px' }}>
                              {asset.code}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenSend(asset.code)}
                              title={`Send ${asset.code}`}
                              style={{ padding: '6px 8px', fontSize: '11px' }}
                            >
                              Send
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenSwap(asset.code)}
                              title={`Swap ${asset.code}`}
                              style={{ padding: '6px 8px', fontSize: '11px' }}
                            >
                              Swap
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Recent Activity Preview */}
                <div
                  className="panel"
                  style={{
                    padding: '20px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      Recent Activity
                    </h3>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setActiveTab('activity')}
                      style={{ fontSize: '11px', color: 'var(--accent)' }}
                    >
                      View All
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activity.length === 0 ? (
                      <div className="text-muted text-xs" style={{ textAlign: 'center', padding: '30px 0' }}>
                        No transactions recorded yet.
                      </div>
                    ) : (
                      activity.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '12.5px', textTransform: 'capitalize' }}>
                              {item.type} {item.assetCode}
                            </div>
                            <div className="text-tertiary" style={{ fontSize: '10px' }}>
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '13px',
                                color: item.type === 'receive' ? 'var(--success)' : 'var(--text-primary)',
                              }}
                            >
                              {item.type === 'receive' ? '+' : item.type === 'send' ? '-' : ''}
                              {item.amount} {item.assetCode}
                            </div>
                            <a
                              href={getExplorerUrl('tx', item.txHash, preferences.network)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '10px', color: 'var(--accent)', textDecoration: 'none' }}
                            >
                              Explorer
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 2: ASSETS & TRUSTLINES MANAGEMENT
              ========================================================================= */}
          {activeTab === 'assets' && (
            <DesktopAssets
              onSendAsset={handleOpenSend}
              onSwapAsset={handleOpenSwap}
            />
          )}

          {/* =========================================================================
              VIEW 3: DEX SWAP
              ========================================================================= */}
          {activeTab === 'swap' && (
            <DesktopSwap
              initialFromAssetCode={transferAssetCode}
              onSuccess={() => refreshData()}
            />
          )}

          {/* =========================================================================
              VIEW 4: SEND PAYMENT
              ========================================================================= */}
          {activeTab === 'send' && (
            <DesktopSend
              initialAssetCode={transferAssetCode}
              onSuccess={() => refreshData()}
            />
          )}

          {/* =========================================================================
              VIEW 5: RECEIVE FUNDS
              ========================================================================= */}
          {activeTab === 'receive' && (
            <DesktopReceive />
          )}

          {/* =========================================================================
              VIEW 6: DEX MARKET TERMINAL (COMING SOON)
              ========================================================================= */}
          {activeTab === 'market' && (
            <MarketTerminalScreen />
          )}

          {/* =========================================================================
              VIEW 7: PERPETUAL FUTURES (COMING SOON)
              ========================================================================= */}
          {activeTab === 'perps' && (
            <PerpsScreen />
          )}

          {/* =========================================================================
              VIEW 8: DIGITAL COLLECTIBLES & NFTS
              ========================================================================= */}
          {activeTab === 'nfts' && (
            <NftGalleryScreen isDesktop={true} />
          )}

          {/* =========================================================================
              VIEW 9: ACTIVITY LEDGER
              ========================================================================= */}
          {activeTab === 'activity' && (
            <DesktopActivity />
          )}

          {/* =========================================================================
              VIEW 10: DAPP SANDBOX
              ========================================================================= */}
          {activeTab === 'dapp' && (
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 2px' }}>
                    Developer dApp Test Harness
                  </h3>
                  <p className="text-muted text-xs" style={{ margin: 0 }}>
                    Test wallet connect and transaction signing requests. Approvals automatically pop up as an extension window in the top-right corner.
                  </p>
                </div>
              </div>
              <DAppSandbox />
            </div>
          )}

          {/* =========================================================================
              VIEW 11: SETTINGS & VAULT SECURITY
              ========================================================================= */}
          {activeTab === 'settings' && (
            <DesktopSettings />
          )}
        </main>
      </div>

      {/* Account Selector Modal (Accessible dropdown modal) */}
      <AccountSelectorModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          refreshData();
        }}
      />
    </div>
  );
};
