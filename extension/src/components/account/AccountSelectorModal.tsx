import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { formatAddress } from '../../services/stellar';
import { Check, Plus, Edit2, X, User, Cpu, Fingerprint } from 'lucide-react';
import { LedgerConnectModal } from '../modals/LedgerConnectModal';
import { PasskeyCreateModal } from '../modals/PasskeyCreateModal';

interface AccountSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSelectorModal: React.FC<AccountSelectorModalProps> = ({ isOpen, onClose }) => {
  const { accounts, activeAccountIndex, switchAccount, addAccount } = useWallet();
  const [isAdding, setIsAdding] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);

  if (!isOpen) return null;

  const handleCreateAccount = async () => {
    setIsAdding(true);
    try {
      await addAccount(newAccountName.trim() || undefined);
      setNewAccountName('');
      setIsAdding(false);
    } catch {
      setIsAdding(false);
    }
  };

  const handleSaveName = (index: number) => {
    if (editingName.trim()) {
      accounts[index].name = editingName.trim();
    }
    setEditingIndex(null);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-subtle)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          padding: '16px',
          maxHeight: '80%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 className="text-base" style={{ fontWeight: 600 }}>Accounts</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Account List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', marginBottom: '16px' }}>
          {accounts.map((acc, index) => {
            const isActive = index === activeAccountIndex;
            return (
              <div
                key={acc.publicKey}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                  border: `1px solid ${isActive ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  switchAccount(index);
                  onClose();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User size={16} color="var(--text-secondary)" />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    {editingIndex === index ? (
                      <div
                        style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          className="input"
                          style={{ padding: '2px 6px', fontSize: '12px', width: '120px' }}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName(index);
                          }}
                          autoFocus
                        />
                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveName(index)}>
                          Save
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{acc.name}</span>
                        {acc.type === 'ledger' && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-subtle)',
                              border: '1px solid var(--border-subtle)',
                              letterSpacing: '0.5px',
                            }}
                          >
                            HW
                          </span>
                        )}
                        {acc.type === 'passkey' && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-subtle)',
                              border: '1px solid var(--border-subtle)',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Smart
                          </span>
                        )}
                        <button
                          className="btn btn-ghost btn-icon"
                          style={{ padding: '2px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIndex(index);
                            setEditingName(acc.name);
                          }}
                          title="Rename account"
                        >
                          <Edit2 size={11} color="var(--text-tertiary)" />
                        </button>
                      </div>
                    )}
                    <div className="text-muted font-mono" style={{ fontSize: '11px' }}>
                      {formatAddress(acc.publicKey, 6)}
                    </div>
                  </div>
                </div>

                {isActive && <Check size={16} color="var(--accent)" />}
              </div>
            );
          })}
        </div>

        {/* Add Account Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input"
              placeholder="New account name (optional)"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
            />
            <button
              className="btn btn-secondary"
              onClick={handleCreateAccount}
              disabled={isAdding}
              style={{ flexShrink: 0 }}
            >
              <Plus size={14} />
              <span>Add Account</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setShowPasskeyModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: '1px dashed var(--border-subtle)',
                padding: '8px 6px',
                fontSize: '11px',
              }}
            >
              <Fingerprint size={14} />
              <span>Create Passkey</span>
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => setShowLedgerModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: '1px dashed var(--border-subtle)',
                padding: '8px 6px',
                fontSize: '11px',
              }}
            >
              <Cpu size={14} />
              <span>Connect Ledger</span>
            </button>
          </div>
        </div>
      </div>

      <LedgerConnectModal
        isOpen={showLedgerModal}
        onClose={() => {
          setShowLedgerModal(false);
          onClose();
        }}
      />

      <PasskeyCreateModal
        isOpen={showPasskeyModal}
        onClose={() => {
          setShowPasskeyModal(false);
          onClose();
        }}
      />
    </div>
  );
};
