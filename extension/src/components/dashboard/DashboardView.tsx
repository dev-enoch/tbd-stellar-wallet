import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import {
  calculatePortfolioPnL,
  CostBasisMethod,
  TimeRange,
  PortfolioPnLSummary,
  setCostBasisOverride,
  getCostBasisOverrides,
  TradeLot,
} from '../../services/pnl';
import {
  PriceAlert,
  getStoredAlerts,
  createPriceAlert,
  deletePriceAlert,
  togglePriceAlert,
  evaluatePriceAlerts,
  AlertCondition,
} from '../../services/alerts';
import {
  DexOrder,
  getOpenOffers,
  cancelOffer,
  exportPortfolioCsv,
} from '../../services/orders';
import { getAccountBalances, AccountBalanceSummary, formatAddress } from '../../services/stellar';
import { getAccountActivity, ActivityItem, MARKET_DATA } from '../../services/history';
import { fetchLiveMarketPrices } from '../../services/market';
import { PriceChart } from '../common/PriceChart';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Download,
  Bell,
  Trash2,
  Plus,
  RefreshCw,
  X,
  AlertCircle,
  Shield,
  Layers,
  Edit2,
} from 'lucide-react';

interface DashboardViewProps {
  onBack?: () => void;
  isFullTab?: boolean;
}

type DashboardTab = 'holdings' | 'alerts' | 'orders';

export const DashboardView: React.FC<DashboardViewProps> = ({ onBack, isFullTab = false }) => {
  const { activeAccount, preferences } = useWallet();

  // State
  const [tab, setTab] = useState<DashboardTab>('holdings');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [costBasisMethod, setCostBasisMethod] = useState<CostBasisMethod>('average_cost');
  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [openOffers, setOpenOffers] = useState<DexOrder[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancellingOfferId, setIsCancellingOfferId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Cost basis edit modal
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [customCostBasisInput, setCustomCostBasisInput] = useState<string>('');

  // Info modal for cost basis method
  const [showMethodModal, setShowMethodModal] = useState<boolean>(false);

  // New alert form state
  const [newAlertAsset, setNewAlertAsset] = useState<string>('XLM');
  const [newAlertCondition, setNewAlertCondition] = useState<AlertCondition>('above');
  const [newAlertTarget, setNewAlertTarget] = useState<string>('');
  const [isAddingAlert, setIsAddingAlert] = useState<boolean>(false);

  // Load all dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!activeAccount) return;
    setIsLoading(true);
    try {
      const [bal, act, offers] = await Promise.all([
        getAccountBalances(activeAccount.publicKey, preferences.network),
        getAccountActivity(activeAccount.publicKey, preferences.network),
        getOpenOffers(activeAccount.publicKey, preferences.network),
      ]);
      await fetchLiveMarketPrices();
      setBalances(bal);
      setActivity(act);
      setOpenOffers(offers);
      const storedAlerts = getStoredAlerts();
      setAlerts(storedAlerts);

      // Evaluate alerts with current market prices
      const prices: Record<string, number> = {};
      Object.keys(MARKET_DATA).forEach((code) => {
        prices[code] = MARKET_DATA[code].priceInUsd;
      });
      evaluatePriceAlerts(prices);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, preferences.network]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Derive mock trade lots from activity for PnL calculation
  const tradeLots: TradeLot[] = useMemo(() => {
    const lots: TradeLot[] = [];
    activity.forEach((act) => {
      const amt = parseFloat(act.amount || '0');
      if (amt <= 0) return;

      const code = act.assetCode || 'XLM';
      const mPrice = MARKET_DATA[code]?.priceInUsd || 0;

      if (act.type === 'receive' || act.type === 'account_created') {
        lots.push({
          id: act.id,
          timestamp: new Date(act.timestamp).getTime(),
          assetCode: code,
          amount: amt,
          pricePerUnit: mPrice,
          fee: 0,
          isExternalTransfer: true,
        });
      } else if (act.type === 'send') {
        lots.push({
          id: act.id,
          timestamp: new Date(act.timestamp).getTime(),
          assetCode: code,
          amount: -amt,
          pricePerUnit: mPrice,
          fee: 0.00001 * (MARKET_DATA.XLM?.priceInUsd || 0),
        });
      }
    });
    return lots;
  }, [activity]);

  // Compute PnL summary
  const pnlSummary: PortfolioPnLSummary = useMemo(() => {
    return calculatePortfolioPnL(
      balances,
      tradeLots,
      costBasisMethod,
      timeRange,
      MARKET_DATA
    );
  }, [balances, tradeLots, costBasisMethod, timeRange]);

  // Handle Cancel Offer
  const handleCancelOffer = async (offer: DexOrder) => {
    if (!activeAccount) return;
    setIsCancellingOfferId(offer.id);
    setStatusMessage('');
    try {
      await cancelOffer({
        offer,
        network: preferences.network,
        signer: activeAccount.signer,
        keypair: activeAccount.keypair,
      });
      setStatusMessage(`Offer #${offer.id} successfully cancelled.`);
      await loadDashboardData();
    } catch (err: any) {
      setStatusMessage(`Failed to cancel offer: ${err.message}`);
    } finally {
      setIsCancellingOfferId(null);
    }
  };

  // Handle CSV Export
  const handleExportCsv = () => {
    exportPortfolioCsv(pnlSummary, activity, openOffers);
  };

  // Handle Save Custom Cost Basis
  const handleSaveCostBasis = () => {
    if (!editingAsset) return;
    const val = parseFloat(customCostBasisInput);
    if (!isNaN(val) && val >= 0) {
      setCostBasisOverride(editingAsset, val);
      setEditingAsset(null);
      setCustomCostBasisInput('');
      loadDashboardData();
    }
  };

  // Handle Add Price Alert
  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newAlertTarget);
    if (isNaN(target) || target <= 0) return;

    createPriceAlert({
      assetCode: newAlertAsset,
      condition: newAlertCondition,
      targetValue: target,
      currentPrice: MARKET_DATA[newAlertAsset]?.priceInUsd,
    });

    setNewAlertTarget('');
    setIsAddingAlert(false);
    setAlerts(getStoredAlerts());
  };

  const isUp = pnlSummary.totalUnrealizedPnL >= 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflowY: 'auto',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onBack && (
            <button className="btn btn-ghost btn-icon" onClick={onBack} style={{ padding: '4px' }}>
              <X size={16} />
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, letterSpacing: '-0.2px' }}>
              Portfolio Dashboard
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {activeAccount?.name} ({formatAddress(activeAccount?.publicKey || '', 4)})
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCsv}
            title="Export transactions and PnL as CSV"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}
          >
            <Download size={13} />
            <span>CSV</span>
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={loadDashboardData}
            title="Refresh Dashboard"
            style={{ padding: '4px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status banner */}
        {statusMessage && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{statusMessage}</span>
            <button className="btn btn-ghost btn-icon" onClick={() => setStatusMessage('')}>
              <X size={12} />
            </button>
          </div>
        )}

        {/* Portfolio Value & PnL Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isFullTab ? 'repeat(4, 1fr)' : '1fr 1fr',
            gap: '10px',
          }}
        >
          {/* Card 1: Total Value */}
          <div
            className="panel"
            style={{
              padding: '14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Portfolio Value
              </span>
              <Shield size={14} color="var(--text-tertiary)" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              ${pnlSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              Excludes {pnlSummary.reservedXlmExcluded.toFixed(2)} XLM reserve
            </div>
          </div>

          {/* Card 2: Unrealized PnL */}
          <div
            className="panel"
            style={{
              padding: '14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Unrealized PnL
              </span>
              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              {isUp ? '+' : ''}${pnlSummary.totalUnrealizedPnL.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>
              {isUp ? '+' : ''}{pnlSummary.totalUnrealizedPnLPercent.toFixed(2)}%
            </div>
          </div>

          {/* Card 3: Realized PnL */}
          <div
            className="panel"
            style={{
              padding: '14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Realized PnL
              </span>
              <Layers size={14} color="var(--text-tertiary)" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              ${pnlSummary.totalRealizedPnL.toFixed(2)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              From closed trades & swaps
            </div>
          </div>

          {/* Card 4: Cost Basis & Method */}
          <div
            className="panel"
            style={{
              padding: '14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Cost Basis Method
              </span>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowMethodModal(true)}
                style={{ padding: '2px' }}
                title="Explain method"
              >
                <Info size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              <button
                className={`btn btn-sm ${costBasisMethod === 'average_cost' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCostBasisMethod('average_cost')}
                style={{ flex: 1, fontSize: '11px', padding: '4px 6px' }}
              >
                Avg Cost
              </button>
              <button
                className={`btn btn-sm ${costBasisMethod === 'fifo' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCostBasisMethod('fifo')}
                style={{ flex: 1, fontSize: '11px', padding: '4px 6px' }}
              >
                FIFO
              </button>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
              Basis: ${pnlSummary.totalCostBasis.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((tr) => (
              <button
                key={tr}
                className={`btn btn-sm ${timeRange === tr ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTimeRange(tr)}
                style={{ padding: '3px 10px', fontSize: '11px', textTransform: 'uppercase' }}
              >
                {tr}
              </button>
            ))}
          </div>

          {pnlSummary.hasUnavailablePrices && (
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={13} />
              <span>Prices unavailable for {pnlSummary.unavailableAssetCodes.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Real Live Interactive Performance Chart */}
        <div
          className="panel"
          style={{
            padding: '16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <PriceChart
            assetCode="XLM"
            currency={preferences.currency}
            height={160}
            showTimeframes={true}
            interactive={true}
          />
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            gap: '16px',
            marginTop: '4px',
          }}
        >
          <button
            onClick={() => setTab('holdings')}
            style={{
              padding: '8px 0',
              fontSize: '13px',
              fontWeight: tab === 'holdings' ? 600 : 400,
              borderBottom: tab === 'holdings' ? '2px solid var(--text-primary)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              color: tab === 'holdings' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Holdings & PnL
          </button>

          <button
            onClick={() => setTab('alerts')}
            style={{
              padding: '8px 0',
              fontSize: '13px',
              fontWeight: tab === 'alerts' ? 600 : 400,
              borderBottom: tab === 'alerts' ? '2px solid var(--text-primary)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              color: tab === 'alerts' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Price Alerts</span>
            {alerts.filter((a) => a.active).length > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {alerts.filter((a) => a.active).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('orders')}
            style={{
              padding: '8px 0',
              fontSize: '13px',
              fontWeight: tab === 'orders' ? 600 : 400,
              borderBottom: tab === 'orders' ? '2px solid var(--text-primary)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              color: tab === 'orders' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>DEX Orders</span>
            {openOffers.length > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {openOffers.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Holdings & Asset PnL */}
        {tab === 'holdings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 0.4fr',
                padding: '6px 12px',
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <span>Asset</span>
              <span style={{ textAlign: 'right' }}>Holdings</span>
              <span style={{ textAlign: 'right' }}>Price</span>
              <span style={{ textAlign: 'right' }}>Unrealized PnL</span>
              <span style={{ textAlign: 'right' }}>Basis</span>
            </div>

            {pnlSummary.assets.map((asset) => {
              const assetUp = (asset.unrealizedPnL || 0) >= 0;
              return (
                <div
                  key={asset.assetCode}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 0.4fr',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  {/* Asset info */}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{asset.assetCode}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {asset.currentValue !== null ? `$${asset.currentValue.toFixed(2)}` : 'Price Unavailable'}
                    </div>
                  </div>

                  {/* Holdings */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 500 }}>{parseFloat(asset.currentBalance).toLocaleString()}</div>
                    {asset.assetCode === 'XLM' && (
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        Spendable: {asset.spendableBalance}
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 500 }}>
                      {asset.currentPrice !== null ? `$${asset.currentPrice.toFixed(4)}` : 'N/A'}
                    </div>
                    {MARKET_DATA[asset.assetCode]?.change24h !== undefined && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: MARKET_DATA[asset.assetCode].change24h >= 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        }}
                      >
                        {MARKET_DATA[asset.assetCode].change24h >= 0 ? '+' : ''}
                        {MARKET_DATA[asset.assetCode].change24h.toFixed(2)}%
                      </div>
                    )}
                  </div>

                  {/* Unrealized PnL */}
                  <div style={{ textAlign: 'right' }}>
                    {asset.unrealizedPnL !== null ? (
                      <>
                        <div style={{ fontWeight: 600 }}>
                          {assetUp ? '+' : ''}${asset.unrealizedPnL.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          {assetUp ? '+' : ''}{asset.unrealizedPnLPercent?.toFixed(2)}%
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Excluded</span>
                    )}
                  </div>

                  {/* Edit Cost Basis */}
                  <div style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => {
                        setEditingAsset(asset.assetCode);
                        const overrides = getCostBasisOverrides();
                        setCustomCostBasisInput(
                          overrides[asset.assetCode]?.toString() || (asset.currentPrice?.toString() || '')
                        );
                      }}
                      title="Edit cost basis"
                      style={{ padding: '4px' }}
                    >
                      <Edit2 size={13} color="var(--text-tertiary)" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Price Alerts */}
        {tab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Local browser alerts (active while browser is open)
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsAddingAlert(!isAddingAlert)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} />
                <span>New Alert</span>
              </button>
            </div>

            {/* Create Alert Box */}
            {isAddingAlert && (
              <form
                onSubmit={handleCreateAlert}
                className="panel"
                style={{
                  padding: '14px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Set Price Alert</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Asset
                    </label>
                    <select
                      className="input"
                      value={newAlertAsset}
                      onChange={(e) => setNewAlertAsset(e.target.value)}
                    >
                      {Object.keys(MARKET_DATA).map((code) => (
                        <option key={code} value={code}>
                          {code} (Current: ${MARKET_DATA[code].priceInUsd})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Condition
                    </label>
                    <select
                      className="input"
                      value={newAlertCondition}
                      onChange={(e) => setNewAlertCondition(e.target.value as AlertCondition)}
                    >
                      <option value="above">Price Rises Above ($)</option>
                      <option value="below">Price Falls Below ($)</option>
                      <option value="pct_change">Price Moves By (%)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Target Value ({newAlertCondition === 'pct_change' ? '%' : 'USD'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    value={newAlertTarget}
                    onChange={(e) => setNewAlertTarget(e.target.value)}
                    placeholder={newAlertCondition === 'pct_change' ? 'e.g. 5.0' : 'e.g. 0.1500'}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsAddingAlert(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Save Alert
                  </button>
                </div>
              </form>
            )}

            {/* Alerts List */}
            {alerts.length === 0 ? (
              <div
                style={{
                  padding: '28px 16px',
                  textAlign: 'center',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-tertiary)',
                  fontSize: '12px',
                }}
              >
                <Bell size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                No price alerts created yet. Click "New Alert" to track market moves.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Bell
                        size={15}
                        color={alert.active ? 'var(--text-primary)' : 'var(--text-tertiary)'}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {alert.assetCode}{' '}
                          {alert.condition === 'above'
                            ? `≥ $${alert.targetValue.toFixed(4)}`
                            : alert.condition === 'below'
                            ? `≤ $${alert.targetValue.toFixed(4)}`
                            : `±${alert.targetValue}% move`}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          {alert.triggeredAt
                            ? `Triggered on ${new Date(alert.triggeredAt).toLocaleTimeString()}`
                            : alert.active
                            ? 'Monitoring in browser'
                            : 'Paused'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className={`btn btn-sm ${alert.active ? 'btn-secondary' : 'btn-ghost'}`}
                        onClick={() => {
                          togglePriceAlert(alert.id, !alert.active);
                          setAlerts(getStoredAlerts());
                        }}
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                      >
                        {alert.active ? 'Active' : 'Paused'}
                      </button>

                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => {
                          deletePriceAlert(alert.id);
                          setAlerts(getStoredAlerts());
                        }}
                        style={{ padding: '4px' }}
                        title="Delete alert"
                      >
                        <Trash2 size={13} color="var(--text-tertiary)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: DEX Orders & History */}
        {tab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Active DEX Offers</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {openOffers.length} open
              </span>
            </div>

            {openOffers.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-tertiary)',
                  fontSize: '12px',
                }}
              >
                No active classic offers found on the Stellar DEX.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {openOffers.map((offer) => (
                  <div
                    key={offer.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>
                          Sell {offer.amount} {offer.sellingAssetCode}
                        </span>
                        <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                        <span>{offer.buyingAssetCode}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Price: {parseFloat(offer.price).toFixed(4)} {offer.buyingAssetCode}/{offer.sellingAssetCode}
                      </div>
                      <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        Offer #{offer.id}
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCancelOffer(offer)}
                      disabled={isCancellingOfferId === offer.id}
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      {isCancellingOfferId === offer.id ? (
                        <>
                          <RefreshCw size={12} className="spin" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <span>Cancel Offer</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Cost Basis Explanation (PRD Section 7) */}
      {showMethodModal && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '20px 16px',
              maxWidth: '360px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Cost Basis Methods</span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowMethodModal(false)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0 }}>
                <strong>Average Cost (Default):</strong> Calculates cost basis as the total acquisition expenditure divided by total units held.
              </p>
              <p style={{ margin: 0 }}>
                <strong>FIFO (First-In, First-Out):</strong> Realizes gains by matching disposals against the earliest chronological purchase lots.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Reserved XLM Exclusion:</strong> Under PRD rules, base reserves and subentry locks are excluded from portfolio gain/loss calculations so protocol reserves do not distort your investment performance.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Incoming Transfers:</strong> Assets received from outside the wallet use the market price at receipt labeled as estimated, or can be overridden manually.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowMethodModal(false)}
              style={{ width: '100%', marginTop: '6px' }}
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Modal: Edit Cost Basis Override */}
      {editingAsset && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '20px 16px',
              maxWidth: '340px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>
                Edit Cost Basis: {editingAsset}
              </span>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditingAsset(null)}>
                <X size={15} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Enter your purchase price per unit in USD. This overrides automatic estimation for incoming transfers.
            </p>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Unit Cost (USD)
              </label>
              <input
                type="number"
                step="any"
                className="input"
                value={customCostBasisInput}
                onChange={(e) => setCustomCostBasisInput(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button className="btn btn-ghost" onClick={() => setEditingAsset(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveCostBasis}>
                Save Basis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
