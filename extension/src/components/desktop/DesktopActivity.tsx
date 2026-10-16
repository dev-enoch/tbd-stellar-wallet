import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { getAccountActivity, ActivityItem } from '../../services/history';
import { getExplorerUrl, formatAddress } from '../../services/stellar';
import {
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  PlusCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Download,
  Copy,
  Check,
  Code,
} from 'lucide-react';

type ActivityFilter = 'all' | 'send' | 'receive' | 'swap' | 'trustline' | 'contract';

export const DesktopActivity: React.FC = () => {
  const { activeAccount, preferences } = useWallet();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Load activities
  const loadActivity = useCallback(async () => {
    if (!activeAccount) return;
    setIsLoading(true);
    try {
      const items = await getAccountActivity(activeAccount.publicKey, preferences.network);
      setActivities(items);
    } catch (err) {
      console.warn('Failed to fetch activity ledger:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, preferences.network]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  // Copy hash feedback
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (activities.length === 0) return;
    const headers = ['Timestamp', 'Type', 'Asset', 'Amount', 'Counterparty', 'TxHash'];
    const rows = activities.map((a) => [
      new Date(a.timestamp).toISOString(),
      a.type,
      a.assetCode,
      a.amount,
      a.counterparty || '',
      a.txHash,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stellith_ledger_${activeAccount?.name || 'account'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Search
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Type filter
      if (filter === 'send' && act.type !== 'send') return false;
      if (filter === 'receive' && act.type !== 'receive' && act.type !== 'account_created') return false;
      if (filter === 'swap' && act.type !== 'swap') return false;
      if (filter === 'trustline' && act.type !== 'trustline_add' && act.type !== 'trustline_remove') return false;
      if (filter === 'contract' && act.type !== 'contract_call') return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        act.txHash.toLowerCase().includes(query) ||
        (act.assetCode && act.assetCode.toLowerCase().includes(query)) ||
        (act.counterparty && act.counterparty.toLowerCase().includes(query)) ||
        (act.description && act.description.toLowerCase().includes(query))
      );
    });
  }, [activities, filter, searchQuery]);

  // Activity Metrics
  const stats = useMemo(() => {
    const sentCount = activities.filter((a) => a.type === 'send').length;
    const recvCount = activities.filter((a) => a.type === 'receive' || a.type === 'account_created').length;
    const swapCount = activities.filter((a) => a.type === 'swap').length;
    return { total: activities.length, sent: sentCount, received: recvCount, swaps: swapCount };
  }, [activities]);

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
        return { label: 'Payment Sent', bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' };
      case 'receive':
      case 'account_created':
        return { label: 'Received', bg: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)' };
      case 'swap':
        return { label: 'DEX Swap', bg: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent)' };
      case 'trustline_add':
        return { label: 'Trustline Created', bg: 'var(--bg-subtle)', color: 'var(--text-secondary)' };
      case 'trustline_remove':
        return { label: 'Trustline Removed', bg: 'var(--bg-subtle)', color: 'var(--text-secondary)' };
      case 'contract_call':
        return { label: 'Soroban Call', bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc' };
      default:
        return { label: 'Operation', bg: 'var(--bg-subtle)', color: 'var(--text-secondary)' };
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ padding: '18px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <div className="text-secondary" style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Transactions
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px' }}>{stats.total}</div>
        </div>

        <div style={{ padding: '18px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase' }}>
            <ArrowUpRight size={13} />
            <span>Payments Sent</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px' }}>{stats.sent}</div>
        </div>

        <div style={{ padding: '18px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase' }}>
            <ArrowDownLeft size={13} />
            <span>Funds Received</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px' }}>{stats.received}</div>
        </div>

        <div style={{ padding: '18px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase' }}>
            <Repeat size={13} />
            <span>SDEX Swaps</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px' }}>{stats.swaps}</div>
        </div>
      </div>

      {/* Main Ledger Table Card */}
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
        {/* Toolbar */}
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
          <div style={{ position: 'relative', width: '340px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search by hash, address, or memo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '36px', fontSize: '12.5px' }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {(
              [
                { id: 'all', label: 'All Operations' },
                { id: 'send', label: 'Sent' },
                { id: 'receive', label: 'Received' },
                { id: 'swap', label: 'Swaps' },
                { id: 'trustline', label: 'Trustlines' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11.5px',
                  fontWeight: filter === item.id ? 700 : 500,
                  border: filter === item.id ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                  background: filter === item.id ? 'var(--bg-subtle)' : 'transparent',
                  color: filter === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Tools: Refresh & CSV Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={loadActivity}
              disabled={isLoading}
              title="Refresh Transactions"
              style={{ width: '36px', height: '36px' }}
            >
              <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportCsv}
              disabled={activities.length === 0}
              style={{ gap: '6px', height: '36px', fontSize: '12px' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Ledger Table */}
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
                <th style={{ padding: '14px 24px' }}>Operation</th>
                <th style={{ padding: '14px 16px' }}>Counterparty / Destination</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '14px 16px' }}>Memo</th>
                <th style={{ padding: '14px 16px' }}>Timestamp</th>
                <th style={{ padding: '14px 16px' }}>Tx Hash</th>
                <th style={{ padding: '14px 24px', textAlign: 'right' }}>Explorer</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {isLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <RefreshCw size={16} className="spin" />
                        <span>Querying Horizon ledger history...</span>
                      </div>
                    ) : (
                      'No matching transactions found on this account.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => {
                  const badge = getActivityBadge(act.type);
                  const isIncoming = act.type === 'receive' || act.type === 'account_created';
                  const isOutgoing = act.type === 'send';
                  const dateStr = new Date(act.timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const timeStr = new Date(act.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={act.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Operation Type */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'var(--bg-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {getActivityIcon(act.type)}
                          </div>
                          <div>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: badge.bg,
                                color: badge.color,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Counterparty */}
                      <td style={{ padding: '16px 16px' }}>
                        {act.counterparty ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="font-mono text-muted" style={{ fontSize: '12px' }}>
                              {formatAddress(act.counterparty, 5)}
                            </span>
                            <a
                              href={getExplorerUrl('account', act.counterparty, preferences.network)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-icon"
                              style={{ padding: '2px', color: 'var(--text-tertiary)' }}
                              title="Inspect on Horizon"
                            >
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-tertiary" style={{ fontSize: '11.5px' }}>—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '16px 16px', textAlign: 'right' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '13.5px',
                            color: isIncoming ? 'var(--success)' : isOutgoing ? 'var(--warning)' : 'var(--text-primary)',
                          }}
                        >
                          {act.amount ? `${isIncoming ? '+' : isOutgoing ? '-' : ''}${parseFloat(act.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}` : '—'}
                        </div>
                        <div className="text-tertiary" style={{ fontSize: '10.5px' }}>{act.assetCode || 'XLM'}</div>
                      </td>

                      {/* Description / Memo */}
                      <td style={{ padding: '16px 16px' }}>
                        {act.description ? (
                          <span
                            className="font-mono"
                            style={{
                              fontSize: '11px',
                              background: 'var(--bg-subtle)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {act.description}
                          </span>
                        ) : (
                          <span className="text-tertiary" style={{ fontSize: '11.5px' }}>—</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{dateStr}</div>
                        <div className="text-tertiary" style={{ fontSize: '10.5px' }}>{timeStr}</div>
                      </td>

                      {/* Tx Hash */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="font-mono text-muted" style={{ fontSize: '11.5px' }}>
                            {act.txHash.substring(0, 8)}…{act.txHash.substring(act.txHash.length - 4)}
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            onClick={() => handleCopyHash(act.txHash)}
                            style={{ padding: '3px' }}
                            title="Copy Transaction Hash"
                          >
                            {copiedHash === act.txHash ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Explorer Link */}
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <a
                          href={getExplorerUrl('tx', act.txHash, preferences.network)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ gap: '4px', fontSize: '11px', padding: '4px 8px', color: 'var(--accent)' }}
                        >
                          <span>StellarExpert</span>
                          <ExternalLink size={11} />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
