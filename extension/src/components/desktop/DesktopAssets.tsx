import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import {
  getAccountBalances,
  formatAddress,
  isValidAddress,
  getExplorerUrl,
  AccountBalanceSummary,
} from '../../services/stellar';
import {
  submitChangeTrust,
  VERIFIED_ASSETS,
} from '../../services/trustlines';
import { getAssetPriceInfo, fetchLiveMarketPrices } from '../../services/market';
import { CURRENCY_RATES } from '../../services/history';
import {
  Coins,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Repeat,
  Info,
  Check,
  X,
} from 'lucide-react';

interface DesktopAssetsProps {
  onSendAsset?: (assetCode: string) => void;
  onSwapAsset?: (assetCode: string) => void;
}

export const DesktopAssets: React.FC<DesktopAssetsProps> = ({ onSendAsset, onSwapAsset }) => {
  const { activeAccount, preferences } = useWallet();

  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'custom'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom Trustline Form
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customIssuer, setCustomIssuer] = useState('');
  const [customLimit, setCustomLimit] = useState('');
  const [customValidation, setCustomValidation] = useState<string | null>(null);

  // Load balances
  const loadBalances = useCallback(async () => {
    if (!activeAccount) return;
    setIsRefreshing(true);
    try {
      const [b] = await Promise.all([
        getAccountBalances(activeAccount.publicKey, preferences.network),
        fetchLiveMarketPrices(),
      ]);
      setBalances(b);
    } catch (err: any) {
      console.warn('Failed to load asset balances:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeAccount, preferences.network]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Check which assets are currently held or have an active trustline
  const heldAssets = balances?.assets || [];
  const existingAssetsMap = useMemo(() => {
    return new Map(heldAssets.map((a) => [a.code + (a.issuer || ''), a]));
  }, [heldAssets]);

  // Curated ecosystem tokens
  const curatedList = useMemo(() => {
    return VERIFIED_ASSETS[preferences.network] || [];
  }, [preferences.network]);

  // Filtered Assets list
  const filteredAssets = useMemo(() => {
    return heldAssets.filter((asset) => {
      const matchesSearch =
        asset.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.issuer && asset.issuer.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'verified') {
        return asset.isNative || curatedList.some((c) => c.code === asset.code);
      }
      if (filterType === 'custom') {
        return !asset.isNative && !curatedList.some((c) => c.code === asset.code);
      }
      return true;
    });
  }, [heldAssets, searchQuery, filterType, curatedList]);

  // Calculate Asset Value in selected currency
  const getAssetFiatValue = (code: string, balanceStr: string) => {
    const priceInfo = getAssetPriceInfo(code);
    const balance = parseFloat(balanceStr) || 0;
    const rate = CURRENCY_RATES[preferences.currency]?.rateFromUsd || 1;
    const fiat = balance * priceInfo.priceInUsd * rate;
    const symbol = preferences.currency === 'EUR' ? '€' : preferences.currency === 'GBP' ? '£' : '$';
    return {
      formatted: `${symbol}${fiat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      priceFormatted: `${symbol}${(priceInfo.priceInUsd * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`,
      change24h: priceInfo.change24h,
    };
  };

  // Add / Remove Trustline
  const handleToggleTrustline = async (code: string, issuer?: string, remove: boolean = false) => {
    if (!activeAccount || !issuer) return;
    setIsProcessing(code);
    try {
      await submitChangeTrust(
        activeAccount.keypair,
        code,
        issuer,
        remove,
        preferences.network,
        activeAccount.signer
      );

      showNotification(
        'success',
        remove
          ? `Trustline for ${code} removed (+0.5 XLM reserve unlocked).`
          : `Trustline for ${code} established (-0.5 XLM reserve committed).`
      );
      await loadBalances();
    } catch (err: any) {
      showNotification('error', err.message || `Failed to modify trustline for ${code}.`);
    } finally {
      setIsProcessing(null);
    }
  };

  // Custom Trustline Submit
  const handleAddCustomTrustline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;

    const trimmedCode = customCode.trim().toUpperCase();
    const trimmedIssuer = customIssuer.trim();

    if (!trimmedCode || trimmedCode.length > 12) {
      setCustomValidation('Asset code must be 1 to 12 alphanumeric characters.');
      return;
    }
    if (!isValidAddress(trimmedIssuer) || !trimmedIssuer.startsWith('G')) {
      setCustomValidation('Issuer must be a valid 56-character Stellar public key (G...).');
      return;
    }

    setCustomValidation(null);
    setIsProcessing('CUSTOM');

    try {
      await submitChangeTrust(
        activeAccount.keypair,
        trimmedCode,
        trimmedIssuer,
        false,
        preferences.network,
        activeAccount.signer
      );

      showNotification('success', `Trustline for ${trimmedCode} added successfully!`);
      setCustomCode('');
      setCustomIssuer('');
      setCustomLimit('');
      setIsCustomOpen(false);
      await loadBalances();
    } catch (err: any) {
      setCustomValidation(err.message || 'Failed to add custom trustline.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '72px',
            right: '32px',
            zIndex: 1000,
            background: notification.type === 'success' ? 'var(--bg-surface)' : 'var(--bg-surface)',
            border: `1px solid ${notification.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} color="var(--success)" />
          ) : (
            <AlertTriangle size={16} color="var(--danger)" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {/* Total Assets Metric */}
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Holdings
            </span>
            <Coins size={16} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800 }}>
            {heldAssets.length} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Tokens</span>
          </div>
          <div className="text-tertiary" style={{ fontSize: '11px' }}>
            Across native XLM & Stellar DEX trustlines
          </div>
        </div>

        {/* Spendable vs Reserved */}
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Spendable Balance
            </span>
            <span className="badge badge-accent" style={{ fontSize: '10px' }}>XLM</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800 }}>
            {parseFloat(balances?.spendableXlm || '0').toLocaleString()}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>XLM</span>
          </div>
          <div className="text-tertiary" style={{ fontSize: '11px' }}>
            Out of {parseFloat(balances?.totalXlm || '0').toLocaleString()} total XLM balance
          </div>
        </div>

        {/* Trustline Reserve Usage */}
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ledger Minimum Reserve
            </span>
            <Info size={16} color="var(--text-tertiary)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800 }}>
            {parseFloat(balances?.reservedXlm || '1.0').toLocaleString()}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>XLM Locked</span>
          </div>
          <div className="text-tertiary" style={{ fontSize: '11px' }}>
            Base account (1.0 XLM) + 0.5 XLM per active trustline
          </div>
        </div>
      </div>

      {/* Main Content: Table & Toolbar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Controls Bar */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search by asset code or issuer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '36px', fontSize: '12.5px' }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(['all', 'verified', 'custom'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11.5px',
                  fontWeight: filterType === type ? 700 : 500,
                  border: filterType === type ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                  background: filterType === type ? 'var(--bg-subtle)' : 'transparent',
                  color: filterType === type ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {type === 'all' ? 'All Holdings' : type === 'verified' ? 'Verified Ecosystem' : 'Custom Trustlines'}
              </button>
            ))}
          </div>

          {/* Actions: Refresh & Add Trustline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={loadBalances}
              disabled={isRefreshing}
              title="Refresh Balances"
              style={{ width: '36px', height: '36px' }}
            >
              <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsCustomOpen(!isCustomOpen)}
              style={{ height: '36px', padding: '0 16px', fontSize: '12.5px', gap: '6px' }}
            >
              <Plus size={15} />
              <span>Add Custom Trustline</span>
            </button>
          </div>
        </div>

        {/* Collapsible Add Custom Trustline Drawer */}
        {isCustomOpen && (
          <form
            onSubmit={handleAddCustomTrustline}
            style={{
              padding: '20px 24px',
              background: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700 }}>
                  Establish Stellar Trustline (SEP-0008 / SDEX)
                </h4>
                <p className="text-muted" style={{ margin: 0, fontSize: '11.5px' }}>
                  Enables your account to hold and trade non-native Stellar assets. Requires a 0.5 XLM reserve commitment.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setIsCustomOpen(false)}
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            {customValidation && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={14} />
                <span>{customValidation}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Asset Code *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. AQUA, USDC"
                  maxLength={12}
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Issuer Public Key (G...) *
                </label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  value={customIssuer}
                  onChange={(e) => setCustomIssuer(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Limit (Optional)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Unlimited"
                  value={customLimit}
                  onChange={(e) => setCustomLimit(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isProcessing === 'CUSTOM'}
                style={{ height: '36px', padding: '0 20px', gap: '6px' }}
              >
                {isProcessing === 'CUSTOM' ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Authorize Trustline</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-subtle)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <th style={{ padding: '14px 24px' }}>Asset</th>
                <th style={{ padding: '14px 16px' }}>Issuer / Contract</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Balance</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Price (USD)</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>24h Change</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Value</th>
                <th style={{ padding: '14px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No matching assets found on this account.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const fiat = getAssetFiatValue(asset.code, asset.balance);
                  const isNative = asset.isNative;
                  const isBusy = isProcessing === asset.code;

                  return (
                    <tr
                      key={asset.code + (asset.issuer || '')}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Asset & Name */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: 'var(--bg-subtle)',
                              border: '1px solid var(--border-focus)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                              flexShrink: 0,
                            }}
                          >
                            {asset.code.substring(0, 3)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{asset.code}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {isNative ? 'Native Stellar Token' : `${asset.code} Token`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Issuer */}
                      <td style={{ padding: '16px 16px' }}>
                        {isNative ? (
                          <span className="badge badge-accent" style={{ fontSize: '10px', fontWeight: 600 }}>
                            Native Protocol
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="font-mono text-muted" style={{ fontSize: '11.5px' }}>
                              {formatAddress(asset.issuer || '', 5)}
                            </span>
                            <a
                              href={getExplorerUrl('account', asset.issuer || '', preferences.network)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-icon"
                              style={{ padding: '3px', color: 'var(--text-tertiary)' }}
                              title="Inspect Issuer on Horizon"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Balance */}
                      <td style={{ padding: '16px 16px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>
                          {parseFloat(asset.balance).toLocaleString()}
                        </div>
                        <div className="text-tertiary" style={{ fontSize: '11px' }}>
                          {asset.code}
                        </div>
                      </td>

                      {/* Price */}
                      <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 600, fontSize: '13.5px' }}>
                        {fiat.priceFormatted}
                      </td>

                      {/* 24h Change */}
                      <td style={{ padding: '16px 16px', textAlign: 'right' }}>
                        <span
                          className={`badge ${fiat.change24h >= 0 ? 'badge-success' : 'badge-danger'}`}
                          style={{ fontSize: '11px', fontWeight: 700 }}
                        >
                          {fiat.change24h >= 0 ? '+' : ''}
                          {fiat.change24h}%
                        </span>
                      </td>

                      {/* Total Value */}
                      <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                        {fiat.formatted}
                      </td>

                      {/* Quick Actions */}
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => onSendAsset?.(asset.code)}
                            title={`Send ${asset.code}`}
                            style={{ gap: '4px', fontSize: '11.5px', padding: '5px 9px' }}
                          >
                            <Send size={12} />
                            <span>Send</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => onSwapAsset?.(asset.code)}
                            title={`Swap ${asset.code}`}
                            style={{ gap: '4px', fontSize: '11.5px', padding: '5px 9px' }}
                          >
                            <Repeat size={12} />
                            <span>Swap</span>
                          </button>

                          {!isNative && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                if (parseFloat(asset.balance) > 0) {
                                  alert(`Cannot remove trustline while your balance is ${asset.balance} ${asset.code}. Please send or swap your balance to 0 first.`);
                                  return;
                                }
                                handleToggleTrustline(asset.code, asset.issuer, true);
                              }}
                              disabled={isBusy}
                              title="Remove Trustline (-0.5 XLM unlocked)"
                              style={{ color: 'var(--danger)', padding: '5px 8px' }}
                            >
                              {isBusy ? <RefreshCw size={12} className="spin" /> : <Trash2 size={13} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verified Stellar Ecosystem Tokens Catalog */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px' }}>
              Verified Stellar Ecosystem Assets
            </h3>
            <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>
              Anchored tokens with verified SEP-0001 stellar.toml domains and high DEX liquidity.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {curatedList.map((curated) => {
            const isHeld = existingAssetsMap.has(curated.code + (curated.issuer || ''));
            const isBusy = isProcessing === curated.code;

            return (
              <div
                key={curated.code}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-focus)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {curated.code.substring(0, 3)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{curated.code}</div>
                    <div className="text-tertiary" style={{ fontSize: '10.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {curated.domain}
                    </div>
                  </div>
                </div>

                <div>
                  {isHeld ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(34, 197, 94, 0.12)',
                        color: 'var(--success)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={12} />
                      <span>Active</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleTrustline(curated.code, curated.issuer, false)}
                      disabled={isBusy}
                      style={{ fontSize: '11px', padding: '4px 10px', gap: '4px' }}
                    >
                      {isBusy ? (
                        <RefreshCw size={11} className="spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      <span>Opt In</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
