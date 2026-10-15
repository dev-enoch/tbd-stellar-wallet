import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
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
} from 'lucide-react';

interface HomeScreenProps {
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
  onAddAsset: () => void;
  onSelectAsset?: (assetCode: string) => void;
  onOpenAccountSelector: () => void;
  onOpenActivity: () => void;
  onOpenSettings: () => void;
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
}) => {
  const { activeAccount, preferences, updatePreferences } = useWallet();
  const { t } = useI18n();

  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [showReserveInfo, setShowReserveInfo] = useState<boolean>(false);
  const [fundingMessage, setFundingMessage] = useState<string>('');

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Account & Network Selector Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
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
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

        {/* 4 Primary Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onSend} style={{ flexDirection: 'column', padding: '12px 6px', gap: '6px' }}>
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
          <button className="btn btn-secondary" onClick={onAddAsset} style={{ flexDirection: 'column', padding: '12px 6px', gap: '6px' }}>
            <PlusCircle size={18} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>{t.addAssetAction}</span>
          </button>
        </div>

        {/* Assets Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.assetsTitle}
            </span>
            <span className="text-xs text-tertiary">
              {balances?.assets.length || 0} {balances?.assets.length === 1 ? 'asset' : 'assets'}
            </span>
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

      {/* Bottom Navigation Tabs */}
      <div
        style={{
          marginTop: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          padding: '8px 0',
        }}
      >
        <button
          className="btn btn-ghost"
          style={{ flexDirection: 'column', gap: '3px', fontSize: '10px', color: 'var(--accent)', fontWeight: 600 }}
        >
          <Home size={16} />
          <span>Home</span>
        </button>
        <button
          className="btn btn-ghost"
          onClick={onOpenActivity}
          style={{ flexDirection: 'column', gap: '3px', fontSize: '10px', color: 'var(--text-secondary)' }}
        >
          <Clock size={16} />
          <span>Activity</span>
        </button>
        <button
          className="btn btn-ghost"
          onClick={onOpenSettings}
          style={{ flexDirection: 'column', gap: '3px', fontSize: '10px', color: 'var(--text-secondary)' }}
        >
          <SettingsIcon size={16} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};
