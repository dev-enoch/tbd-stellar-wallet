import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

interface HistoryScreenProps {
  onBack: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack }) => {
  const { activeAccount, preferences } = useWallet();
  const { t } = useI18n();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    if (!activeAccount) return;
    setIsLoading(true);
    try {
      const items = await getAccountActivity(activeAccount.publicKey, preferences.network);
      setActivities(items);
    } catch {
      // cache is returned on failure
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, preferences.network]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'send':
        return <ArrowUpRight size={15} color="var(--text-primary)" />;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button className="btn btn-ghost btn-icon" onClick={onBack}>
          <ArrowLeft size={16} />
        </button>
        <span className="text-xs text-muted" style={{ fontWeight: 600 }}>{t.historyTitle}</span>
        <button
          className="btn btn-ghost btn-icon"
          onClick={loadActivity}
          disabled={isLoading}
          title="Refresh activity"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
        {activities.length === 0 && !isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px',
              }}
            >
              <Clock size={18} color="var(--text-tertiary)" />
            </div>
            <p className="text-sm" style={{ fontWeight: 500, marginBottom: '4px' }}>{t.noTransactions}</p>
            <p className="text-xs text-tertiary">Payments, swaps, and trustlines will appear here once executed.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activities.map((act) => (
              <div
                key={act.id}
                className="panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getActivityIcon(act.type)}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {act.title}
                    </div>
                    <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                      {act.description}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                  <div className="text-xs text-tertiary" style={{ marginBottom: '4px' }}>
                    {act.formattedDate}
                  </div>
                  <a
                    href={getExplorerUrl('tx', act.txHash, preferences.network)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0 4px', fontSize: '10px', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    title="View on Stellar.Expert"
                  >
                    <span>Explorer</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <span className="text-xs text-tertiary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={12} />
          <span>Synced with Stellar Horizon Ledger</span>
        </span>
      </div>
    </div>
  );
};
