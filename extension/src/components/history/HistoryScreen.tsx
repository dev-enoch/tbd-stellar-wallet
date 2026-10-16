import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
import { getAccountActivity, ActivityItem } from '../../services/history';
import { getExplorerUrl } from '../../services/stellar';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  PlusCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  Code,
  ShieldCheck,
  X,
} from 'lucide-react';

interface HistoryScreenProps {
  onBack: () => void;
}

type ActivityFilter = 'all' | 'send' | 'receive' | 'swap';

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack }) => {
  const { activeAccount, preferences } = useWallet();
  const { t } = useI18n();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const loadActivity = useCallback(async () => {
    if (!activeAccount) return;
    setIsLoading(true);
    try {
      const items = await getAccountActivity(activeAccount.publicKey, preferences.network);
      setActivities(items);
    } catch {
      // cache fallback
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, preferences.network]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter((act) => act.type === filter);
  }, [activities, filter]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'send':
        return <ArrowUpRight size={15} color="var(--warning)" />;
      case 'receive':
      case 'account_created':
        return <ArrowDownLeft size={15} color="var(--success)" />;
      case 'swap':
        return <Repeat size={14} color="var(--accent)" />;
      case 'trustline_add':
      case 'trustline_remove':
        return <PlusCircle size={14} color="var(--text-secondary)" />;
      case 'contract_call':
        return <Code size={14} color="var(--text-secondary)" />;
      default:
        return <Clock size={14} />;
    }
  };

  const getActivityBadge = (type: ActivityItem['type']) => {
    switch (type) {
      case 'send':
        return { label: 'Sent', bg: 'var(--warning-subtle)', color: 'var(--warning)' };
      case 'receive':
      case 'account_created':
        return { label: 'Received', bg: 'var(--success-subtle)', color: 'var(--success)' };
      case 'swap':
        return { label: 'Swap', bg: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' };
      default:
        return { label: 'Ledger', bg: 'var(--bg-subtle)', color: 'var(--text-secondary)' };
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
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
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onBack}
            style={{ padding: '6px' }}
          >
            <ArrowLeft size={16} />
          </button>
          <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            {t.historyTitle}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={loadActivity}
            disabled={isLoading}
            title="Refresh on-chain activity"
            style={{ padding: '6px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onBack}
            style={{ padding: '6px' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-subtle)',
          flexShrink: 0,
        }}
      >
        {(['all', 'send', 'receive', 'swap'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              textTransform: 'capitalize',
              background: filter === cat ? 'var(--accent)' : 'transparent',
              color: filter === cat ? '#ffffff' : 'var(--text-secondary)',
              transition: 'background 0.15s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Activity List Container */}
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '16px 20px' }}>
        {filteredActivities.length === 0 && !isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--text-secondary)' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--bg-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
              }}
            >
              <Clock size={20} color="var(--text-tertiary)" />
            </div>
            <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
              {t.noTransactions}
            </p>
            <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-secondary)' }}>
              Executed transactions and payments on the Stellar ledger will be synced here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredActivities.map((act) => {
              const badge = getActivityBadge(act.type);

              return (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: badge.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getActivityIcon(act.type)}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{act.title}</span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-xs)',
                            background: badge.bg,
                            color: badge.color,
                            textTransform: 'uppercase',
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div
                        className="font-mono text-muted"
                        style={{
                          fontSize: '11px',
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {act.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {act.formattedDate}
                    </div>
                    <a
                      href={getExplorerUrl('tx', act.txHash, preferences.network)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: 'var(--accent)',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                      title="View on Stellar.Expert"
                    >
                      <span>Explorer</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer ledger status */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        <ShieldCheck size={12} color="var(--success)" />
        <span>Live Horizon On-Chain Synchronization ({preferences.network})</span>
      </div>
    </div>
  );
};
