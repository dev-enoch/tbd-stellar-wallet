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
  CURRENCY_RATES,
} from '../../services/history';
import { fetchLiveMarketPrices, getAssetPriceInfo } from '../../services/market';
import { PriceChart } from '../common/PriceChart';
import { SendScreen } from '../send/SendScreen';
import { ReceiveScreen } from '../receive/ReceiveScreen';
import { SwapScreen } from '../swap/SwapScreen';
import { ManageAssetsScreen } from '../assets/ManageAssetsScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { HistoryScreen } from '../history/HistoryScreen';
import { DAppSandbox } from '../dapp/DAppSandbox';
import { AccountSelectorModal } from '../account/AccountSelectorModal';
import {
  Send,
  Download,
  Repeat,
  PlusCircle,
  Info,
  CheckCircle2,
  ExternalLink,
  Lock,
  Sun,
  Moon,
  Settings,
  ChevronDown,
  Copy,
  Check,
  X,
  Code2,
  Banknote,
  Sparkles,
} from 'lucide-react';

export const DesktopShell: React.FC = () => {
  const {
    activeAccount,
    preferences,
    updatePreferences,
    lock,
  } = useWallet();
  const { theme, toggleTheme } = useTheme();

  // Data State
  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [fundingMessage, setFundingMessage] = useState<string>('');

  // UI Interactive State
  const [chartAsset, setChartAsset] = useState<string>('XLM');
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [showReserveInfo, setShowReserveInfo] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);

  // Desktop Modal Routing State
  const [activeModal, setActiveModal] = useState<
    'send' | 'receive' | 'swap' | 'addAsset' | 'settings' | 'history' | 'dapp' | null
  >(null);
  const [modalAssetCode, setModalAssetCode] = useState<string>('XLM');

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
      setFundingMessage('Friendbot request failed.');
    } finally {
      setIsFunding(false);
    }
  };

  // Open Send modal with specific pre-selected asset
  const handleOpenSend = (code: string = 'XLM') => {
    setModalAssetCode(code);
    setActiveModal('send');
  };

  // Open Swap modal with specific asset
  const handleOpenSwap = (code: string = 'XLM') => {
    setModalAssetCode(code);
    setActiveModal('swap');
  };

  // Portfolio Totals using live market rates
  const currencyInfo = CURRENCY_RATES[preferences.currency] || CURRENCY_RATES.USD;
  const portfolioSummary = useMemo(() => {
    if (!balances) {
      return { totalFiat: '0.00', totalChange24h: '0.00', formatted: `${currencyInfo.symbol}0.00` };
    }
    return calculatePortfolioTotal(balances.assets, preferences.currency);
  }, [balances, preferences.currency, currencyInfo]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. TOP DESKTOP NAVIGATION BAR */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Left: Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/Stellith_logo.jpg"
            alt="Stellith Logo"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              objectFit: 'contain',
              filter: theme === 'dark' ? 'invert(1)' : 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Stellith
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Desktop v1.0
            </span>
          </div>

          <div style={{ height: '20px', width: '1px', background: 'var(--border-subtle)', margin: '0 6px' }} />

          {/* Network Switcher Badge */}
          <button
            type="button"
            className={`badge ${preferences.network === 'testnet' ? 'badge-accent' : 'badge-success'}`}
            onClick={() =>
              updatePreferences({
                network: preferences.network === 'testnet' ? 'mainnet' : 'testnet',
              })
            }
            title="Click to switch between Testnet and Mainnet"
            style={{
              cursor: 'pointer',
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: preferences.network === 'testnet' ? 'var(--accent)' : 'var(--success)',
              }}
            />
            <span style={{ textTransform: 'capitalize' }}>{preferences.network}</span>
          </button>
        </div>

        {/* Center: Navigation shortcuts */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeModal === null ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setActiveModal(null)}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeModal === 'history' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setActiveModal('history')}
          >
            Activity
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeModal === 'dapp' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setActiveModal('dapp')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Code2 size={13} />
            <span>Developer Sandbox</span>
          </button>
        </nav>

        {/* Right: Account Pill, Settings, Theme, Lock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Account Selector Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: 0,
              }}
            >
              <span>{activeAccount?.name || 'Account'}</span>
              <span className="font-mono text-muted text-xs">
                ({formatAddress(activeAccount?.publicKey || '', 4)})
              </span>
              <ChevronDown size={13} color="var(--text-tertiary)" />
            </button>

            <button
              type="button"
              onClick={handleCopyAddress}
              title="Copy Public Key"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              {copiedAddress ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
            </button>
          </div>

          {/* Currency Switcher */}
          <select
            className="select"
            value={preferences.currency}
            onChange={(e) => updatePreferences({ currency: e.target.value as any })}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              width: 'auto',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <option value="USD">USD ($)</option>
            <option value="NGN">NGN (₦)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>

          {/* Theme Toggle */}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ padding: '6px' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Settings */}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setActiveModal('settings')}
            title="Wallet Settings"
            style={{ padding: '6px' }}
          >
            <Settings size={16} />
          </button>

          {/* Lock Wallet */}
          <button
            type="button"
            className="btn btn-ghost btn-icon danger"
            onClick={lock}
            title="Lock Wallet"
            style={{ padding: '6px' }}
          >
            <Lock size={16} />
          </button>
        </div>
      </header>

      {/* 2. MAIN DESKTOP DASHBOARD CONTENT */}
      <main
        style={{
          flex: 1,
          maxWidth: '1360px',
          width: '100%',
          margin: '0 auto',
          padding: '28px 24px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Unfunded Testnet Banner */}
        {balances && !balances.exists && preferences.network === 'testnet' && (
          <div
            className="panel"
            style={{
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
          <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '-12px' }}>
            {fundingMessage}
          </div>
        )}

        {/* ROW 1: PORTFOLIO HERO CARD & INTERACTIVE REAL CHART */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.6fr',
            gap: '20px',
          }}
        >
          {/* Card 1: Net Worth & Quick Actions */}
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

            {/* Quick Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '24px' }}>
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
                onClick={() => setActiveModal('receive')}
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

              <button
                type="button"
                className="btn btn-secondary"
                disabled
                title="Fiat on/off-ramp is paused pending licensing (Coming Soon)"
                style={{
                  flexDirection: 'column',
                  padding: '14px 8px',
                  gap: '6px',
                  opacity: 0.45,
                  cursor: 'not-allowed',
                }}
              >
                <Banknote size={18} />
                <span style={{ fontSize: '10px', fontWeight: 700 }}>Coming Soon</span>
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

        {/* ROW 2: ASSETS & HOLDINGS TABLE + RECENT ACTIVITY (2-Column Grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '20px' }}>
          {/* Left Column: Tokens & Assets Table */}
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
                  Portfolio Holdings ({balances?.assets.length || 0})
                </h3>
                <p className="text-muted text-xs" style={{ margin: 0 }}>
                  Active trustlines and native token balances on Stellar network
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveModal('addAsset')}
                style={{ gap: '6px', fontSize: '11px' }}
              >
                <PlusCircle size={13} />
                <span>Add Trustline</span>
              </button>
            </div>

            {/* Assets Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Asset</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Balance</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Price</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>24h Change</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Total Value</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {balances?.assets.map((asset) => {
                    const priceInfo = getAssetPriceInfo(asset.code);
                    const priceFiat = priceInfo.priceInUsd * currencyInfo.rateFromUsd;
                    const balanceFloat = parseFloat(asset.balance);
                    const totalValue = balanceFloat * priceFiat;
                    const isPositive = priceInfo.change24h >= 0;

                    return (
                      <tr
                        key={asset.code + (asset.issuer || '')}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Asset name & icon */}
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-subtle)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '11px',
                              }}
                            >
                              {asset.code.slice(0, 3)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontWeight: 700, fontSize: '13px' }}>{asset.code}</span>
                                {asset.code !== 'XLM' && (
                                  <CheckCircle2 size={11} color="var(--accent)" />
                                )}
                              </div>
                              <div className="font-mono text-muted text-xs">
                                {asset.code === 'XLM' ? 'Stellar Lumens' : formatAddress(asset.issuer || '', 4)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Balance */}
                        <td style={{ padding: '12px 10px', fontWeight: 600, fontSize: '13px' }}>
                          {balanceFloat.toLocaleString()}
                        </td>

                        {/* Price */}
                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                          {currencyInfo.symbol}
                          {priceFiat.toFixed(priceFiat < 0.1 ? 4 : 2)}
                        </td>

                        {/* 24h Change */}
                        <td style={{ padding: '12px 10px' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: isPositive ? 'var(--success)' : 'var(--danger)',
                            }}
                          >
                            {isPositive ? '+' : ''}
                            {priceInfo.change24h.toFixed(2)}%
                          </span>
                        </td>

                        {/* Total Value */}
                        <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                          {currencyInfo.symbol}
                          {totalValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* Direct Actions: Send (pre-selects this token!), Swap */}
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenSend(asset.code)}
                              title={`Send ${asset.code}`}
                              style={{ padding: '3px 8px', fontSize: '11px', gap: '4px' }}
                            >
                              <Send size={11} />
                              <span>Send</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenSwap(asset.code)}
                              title={`Swap ${asset.code}`}
                              style={{ padding: '3px 8px', fontSize: '11px', gap: '4px' }}
                            >
                              <Repeat size={11} />
                              <span>Swap</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Recent Activity Feed & DEX Offers */}
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
                  Recent Activity
                </h3>
                <p className="text-muted text-xs" style={{ margin: 0 }}>
                  Confirmed transactions on Stellar ledger
                </p>
              </div>

              <a
                href={getExplorerUrl('account', activeAccount?.publicKey || '', preferences.network)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '11px',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                }}
              >
                <span>View All</span>
                <ExternalLink size={11} />
              </a>
            </div>

            {/* Activity Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {activity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  No recent on-chain transactions detected for this account.
                </div>
              ) : (
                activity.slice(0, 7).map((item) => (
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
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: item.type === 'send' ? 'var(--warning-subtle)' : 'var(--success-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: item.type === 'send' ? 'var(--warning)' : 'var(--success)',
                        }}
                      >
                        {item.type === 'send' ? <Send size={13} /> : <Download size={13} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
                          {item.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {item.formattedDate}
                      </div>
                      <a
                        href={getExplorerUrl('tx', item.txHash, preferences.network)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '10px',
                          color: 'var(--accent)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <span>{formatAddress(item.txHash, 3)}</span>
                        <ExternalLink size={9} />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 3. DESKTOP MODAL OVERLAYS (Send, Receive, Swap, Add Asset, Settings, History, dApp) */}
      {activeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => {
            // Send and Swap modals only close via close button or transaction completion
            if (activeModal !== 'send' && activeModal !== 'swap') {
              setActiveModal(null);
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth:
                activeModal === 'dapp'
                  ? '840px'
                  : activeModal === 'history'
                  ? '720px'
                  : activeModal === 'settings'
                  ? '640px'
                  : activeModal === 'addAsset'
                  ? '560px'
                  : activeModal === 'send' || activeModal === 'swap'
                  ? '520px'
                  : '460px',
              height:
                activeModal === 'dapp'
                  ? '740px'
                  : activeModal === 'history'
                  ? '680px'
                  : activeModal === 'settings'
                  ? '660px'
                  : '640px',
              maxHeight: '92vh',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {activeModal === 'send' ? (
              <SendScreen
                initialAssetCode={modalAssetCode}
                onBack={() => setActiveModal(null)}
                onSuccess={() => {
                  setActiveModal(null);
                  refreshData();
                }}
              />
            ) : activeModal === 'receive' ? (
              <ReceiveScreen onBack={() => setActiveModal(null)} />
            ) : activeModal === 'swap' ? (
              <SwapScreen
                initialFromAssetCode={modalAssetCode}
                onBack={() => setActiveModal(null)}
                onSuccess={() => {
                  setActiveModal(null);
                  refreshData();
                }}
              />
            ) : activeModal === 'addAsset' ? (
              <ManageAssetsScreen onBack={() => setActiveModal(null)} />
            ) : activeModal === 'history' ? (
              <HistoryScreen onBack={() => setActiveModal(null)} />
            ) : activeModal === 'settings' ? (
              <SettingsScreen onBack={() => setActiveModal(null)} />
            ) : activeModal === 'dapp' ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Developer dApp Provider Sandbox</h3>
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => setActiveModal(null)}>
                    <X size={16} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <DAppSandbox />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Account Selector Modal */}
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
