import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useI18n } from '../../contexts/I18nContext';
import {
  searchCuratedAssets,
  submitChangeTrust,
  CuratedAsset,
} from '../../services/trustlines';
import {
  getAccountBalances,
  formatAddress,
  isValidAddress,
  AccountBalanceSummary,
} from '../../services/stellar';
import {
  ArrowLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface ManageAssetsScreenProps {
  onBack: () => void;
}

export const ManageAssetsScreen: React.FC<ManageAssetsScreenProps> = ({ onBack }) => {
  const { activeAccount, preferences } = useWallet();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [balances, setBalances] = useState<AccountBalanceSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Custom asset form
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customIssuer, setCustomIssuer] = useState('');

  const loadData = async () => {
    if (!activeAccount) return;
    try {
      const b = await getAccountBalances(activeAccount.publicKey, preferences.network);
      setBalances(b);
    } catch {
      // keep cache
    }
  };

  useEffect(() => {
    loadData();
  }, [activeAccount, preferences.network]);

  const existingAssetsMap = new Map(
    balances?.assets.map((a) => [a.code + (a.issuer || ''), a])
  );

  const curatedAssets = searchCuratedAssets(searchQuery, preferences.network);

  const handleToggleTrustline = async (asset: CuratedAsset, remove: boolean) => {
    if (!activeAccount) return;
    setError('');
    setSuccessMsg('');
    setIsProcessing(asset.code);

    try {
      await submitChangeTrust(
        activeAccount.keypair,
        asset.code,
        asset.issuer,
        remove,
        preferences.network
      );

      setSuccessMsg(
        remove
          ? `Successfully removed trustline for ${asset.code} (+0.5 XLM unlocked).`
          : `Successfully opted in to ${asset.code} (0.5 XLM reserved).`
      );

      await loadData();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAddCustomAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;
    setError('');
    setSuccessMsg('');

    const code = customCode.trim().toUpperCase();
    const issuer = customIssuer.trim();

    if (!code || code.length > 12) {
      setError('Asset code must be 1 to 12 alphanumeric characters.');
      return;
    }

    if (!isValidAddress(issuer)) {
      setError('Invalid Stellar issuer public address.');
      return;
    }

    setIsProcessing(code);
    try {
      await submitChangeTrust(activeAccount.keypair, code, issuer, false, preferences.network);
      setSuccessMsg(`Opted in to custom asset ${code}.`);
      setCustomCode('');
      setCustomIssuer('');
      setIsCustomMode(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to add custom asset trustline');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header - Compact */}
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
        <button className="btn btn-ghost btn-icon" onClick={onBack} style={{ padding: '4px' }}>
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>{t.manageAssetsTitle}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setIsCustomMode(!isCustomMode);
            setError('');
          }}
          style={{ fontSize: '11px', color: 'var(--accent)', padding: '2px 6px' }}
        >
          {isCustomMode ? 'Curated List' : '+ Custom'}
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '14px 16px 28px' }}>
        {/* Explanation Card */}
        <div className="panel-subtle" style={{ marginBottom: '14px' }}>
          <p className="text-muted text-xs" style={{ lineHeight: 1.45 }}>
            {t.trustlineExplanation}
          </p>
        </div>

        {error && (
          <div className="banner banner-danger" style={{ marginBottom: '12px' }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="banner banner-info" style={{ marginBottom: '12px', borderColor: 'var(--success)', color: 'var(--success)' }}>
            <CheckCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{successMsg}</div>
          </div>
        )}

        {isCustomMode ? (
          /* Custom Asset Form */
          <form onSubmit={handleAddCustomAsset} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="banner banner-warning">
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{t.unverifiedAssetWarn}</div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Asset Code (e.g. USDC, BTC)</label>
              <input
                type="text"
                className="input"
                placeholder="Asset Code"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Issuer Public Address (G...)</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="G…"
                value={customIssuer}
                onChange={(e) => setCustomIssuer(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={!!isProcessing || !customCode || !customIssuer}
              style={{ marginTop: '8px' }}
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <span>Opt In to Custom Asset</span>}
            </button>
          </form>
        ) : (
          /* Curated Asset Search & List */
          <div>
            <div className="form-group">
              <div style={{ position: 'relative' }}>
                <Search
                  size={14}
                  style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }}
                />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '32px' }}
                  placeholder={t.searchAssetPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {curatedAssets.map((asset) => {
                const existing = existingAssetsMap.get(asset.code + asset.issuer);
                const isOptedIn = !!existing;
                const balance = existing ? existing.balance : '0.00';
                const hasBalance = parseFloat(balance) > 0;
                const isWorking = isProcessing === asset.code;

                return (
                  <div
                    key={asset.code}
                    className="panel"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{asset.code}</span>
                        {asset.verified && (
                          <span className="badge badge-accent" style={{ fontSize: '10px', padding: '1px 5px' }}>
                            <CheckCircle size={10} />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>

                      <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                        {asset.name} · {asset.domain}
                      </div>

                      <div className="text-tertiary font-mono" style={{ fontSize: '10px', marginTop: '2px' }}>
                        Issuer: {formatAddress(asset.issuer, 5)}
                      </div>

                      {isOptedIn && (
                        <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                          Holding: <span style={{ color: 'var(--text-primary)' }}>{parseFloat(balance).toLocaleString()} {asset.code}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                      {isOptedIn ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{
                            color: hasBalance ? 'var(--text-tertiary)' : 'var(--danger)',
                            borderColor: hasBalance ? 'var(--border-subtle)' : 'var(--danger)',
                          }}
                          disabled={isWorking || hasBalance}
                          title={hasBalance ? t.cannotRemoveNonZero : 'Remove trustline (+0.5 XLM)'}
                          onClick={() => handleToggleTrustline(asset, true)}
                        >
                          {isWorking ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Trash2 size={12} />
                              <span>{t.removeAssetBtn}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={isWorking}
                          onClick={() => handleToggleTrustline(asset, false)}
                        >
                          {isWorking ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Plus size={12} />
                              <span>{t.addAssetBtn}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <a
          href="https://stellar.expert/explorer/public/asset"
          target="_blank"
          rel="noreferrer"
          className="text-tertiary"
          style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <span>Explore all Stellar directory assets</span>
          <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
};
