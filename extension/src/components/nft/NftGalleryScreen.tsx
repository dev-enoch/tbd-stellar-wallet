import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { formatAddress } from '../../services/stellar';
import {
  Sparkles,
  Search,
  ExternalLink,
  Copy,
  Check,
  X,
  Layers,
  ArrowLeft,
} from 'lucide-react';

export interface StellarNft {
  id: string;
  name: string;
  collection: string;
  imageUrl: string;
  code: string;
  issuer: string;
  description: string;
  rarity: 'Legendary' | 'Rare' | 'Uncommon' | 'Common';
  category: 'art' | 'pass' | 'gaming' | 'badge';
  attributes: { trait: string; value: string }[];
  mintDate: string;
}

const SAMPLE_STELLAR_NFTS: StellarNft[] = [
  {
    id: 'lum-042',
    name: 'Lumenth Genesis #042',
    collection: 'Lumenth Explorers',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80',
    code: 'LUM042',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    description: 'First generation cybernetic explorer minted on the Stellar network following the SEP-0027 NFT standard.',
    rarity: 'Legendary',
    category: 'art',
    mintDate: '2024-03-12',
    attributes: [
      { trait: 'Background', value: 'Deep Cosmos Nebula' },
      { trait: 'Suit', value: 'Quantum Exo-Plating' },
      { trait: 'Visor', value: 'Prismatic Stellar Wave' },
      { trait: 'Affiliation', value: 'Lumens Consortium' },
    ],
  },
  {
    id: 'aqua-vip',
    name: 'AQUA Whale VIP Pass #007',
    collection: 'Aquarius Guild Passes',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
    code: 'AQUAVIP',
    issuer: 'GBNZILSTVQZ4RWOF99E2DUMMYISSUERFORTESTNETDEMO0011223344',
    description: 'Exclusive governance & fee rebate tier membership pass for top liquidity providers on the Stellar DEX.',
    rarity: 'Rare',
    category: 'pass',
    mintDate: '2024-06-20',
    attributes: [
      { trait: 'Tier', value: 'Whale Diamond' },
      { trait: 'Fee Rebate', value: '25% Boost' },
      { trait: 'Voting Weight', value: '3.5x Multiplier' },
    ],
  },
  {
    id: 'soroban-108',
    name: 'Soroban Pioneer Badge #108',
    collection: 'Soroban Smart Contract Pioneers',
    imageUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500&auto=format&fit=crop&q=80',
    code: 'SORO108',
    issuer: 'GCDNJUBQSX7AJWLJACMJ7I4BC3Z47EXKEVMNOQ7CNKUQLDYZA5D108XX',
    description: 'Awarded to early smart contract builders and validators deploying Rust contracts to Soroban testnet.',
    rarity: 'Rare',
    category: 'badge',
    mintDate: '2024-08-05',
    attributes: [
      { trait: 'Ecosystem', value: 'Soroban Engine' },
      { trait: 'Contract Ver', value: 'v21.0' },
      { trait: 'Status', value: 'Verified Creator' },
    ],
  },
  {
    id: 'stellar-mech',
    name: 'Stellar Mech Cannoneer #77',
    collection: 'Galactic Horizon Mechs',
    imageUrl: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=500&auto=format&fit=crop&q=80',
    code: 'MECH77',
    issuer: 'GCMECH77DUMMYISSUERTESTNETSTELLARHORIZONXLM990011223344',
    description: 'Battle-hardened mechanized battle unit operational across inter-ledger trade routes.',
    rarity: 'Uncommon',
    category: 'gaming',
    mintDate: '2024-09-18',
    attributes: [
      { trait: 'Class', value: 'Heavy Artillery' },
      { trait: 'Hull Power', value: '9,450 HP' },
      { trait: 'Weapon', value: 'Plasma Railgun' },
    ],
  },
];

interface NftGalleryScreenProps {
  onBack?: () => void;
  isDesktop?: boolean;
}

export const NftGalleryScreen: React.FC<NftGalleryScreenProps> = ({
  onBack,
  isDesktop = false,
}) => {
  const { preferences } = useWallet();
  const [selectedNft, setSelectedNft] = useState<StellarNft | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'art' | 'pass' | 'gaming' | 'badge'>('all');
  const [copiedIssuer, setCopiedIssuer] = useState(false);

  const filteredNfts = SAMPLE_STELLAR_NFTS.filter((nft) => {
    const matchesSearch =
      nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.collection.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === 'all' || nft.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const handleCopyIssuer = (issuer: string) => {
    navigator.clipboard.writeText(issuer);
    setCopiedIssuer(true);
    setTimeout(() => setCopiedIssuer(false), 2000);
  };

  const getRarityBadgeColor = (rarity: StellarNft['rarity']) => {
    switch (rarity) {
      case 'Legendary':
        return 'badge-accent';
      case 'Rare':
        return 'badge-info';
      case 'Uncommon':
        return 'badge-success';
      default:
        return '';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isDesktop ? '16px 28px' : '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <button className="btn btn-ghost btn-icon" onClick={onBack} style={{ padding: '4px' }}>
              <ArrowLeft size={16} />
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: isDesktop ? '32px' : '26px',
                height: isDesktop ? '32px' : '26px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ec4899',
              }}
            >
              <Sparkles size={isDesktop ? 16 : 14} />
            </div>
            <div>
              <h2 style={{ fontSize: isDesktop ? '17px' : '14px', fontWeight: 700, margin: 0 }}>
                Stellar Collectibles & NFTs
              </h2>
              {isDesktop && (
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                  SEP-0027 Verified Digital Collectibles on Stellar
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-accent" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
            {filteredNfts.length} Items
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          padding: isDesktop ? '16px 28px 12px' : '10px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-primary)',
          flexShrink: 0,
        }}
      >
        {/* Search Input */}
        <div
          style={{
            position: 'relative',
            flex: isDesktop ? '0 1 280px' : '1',
            minWidth: '160px',
          }}
        >
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search NFT or collection…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '30px', fontSize: '12px', height: '34px' }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {(['all', 'art', 'pass', 'gaming', 'badge'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: activeCategory === cat ? 700 : 500,
                borderRadius: 'var(--radius-full)',
                border:
                  activeCategory === cat ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                background: activeCategory === cat ? 'var(--bg-subtle)' : 'transparent',
                color: activeCategory === cat ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Gallery Grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: isDesktop ? '24px 28px' : '12px',
        }}
      >
        {filteredNfts.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px 16px',
              gap: '12px',
              color: 'var(--text-tertiary)',
            }}
          >
            <Layers size={36} style={{ opacity: 0.4 }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, color: 'var(--text-primary)' }}>
                No Collectibles Found
              </p>
              <p style={{ fontSize: '12px', margin: '4px 0 0', maxWidth: '300px' }}>
                {searchQuery
                  ? `No items match "${searchQuery}". Try a different search term.`
                  : 'You do not own any NFTs in this category on this account.'}
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isDesktop
                ? 'repeat(auto-fill, minmax(230px, 1fr))'
                : 'repeat(2, 1fr)',
              gap: isDesktop ? '18px' : '10px',
            }}
          >
            {filteredNfts.map((nft) => (
              <div
                key={nft.id}
                onClick={() => setSelectedNft(nft)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Media Image */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '100%',
                    background: 'var(--bg-subtle)',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={nft.imageUrl}
                    alt={nft.name}
                    loading="lazy"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                    }}
                  >
                    <span
                      className={`badge ${getRarityBadgeColor(nft.rarity)}`}
                      style={{ fontSize: '9px', fontWeight: 700 }}
                    >
                      {nft.rarity}
                    </span>
                  </div>
                </div>

                {/* NFT Details */}
                <div style={{ padding: isDesktop ? '12px' : '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {nft.collection}
                  </div>
                  <div
                    style={{
                      fontSize: isDesktop ? '13px' : '11.5px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {nft.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '4px',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span className="badge" style={{ fontSize: '9px' }}>{nft.code}</span>
                    <span style={{ fontSize: '10px' }}>Stellar SEP-27</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NFT Detail Modal / Drawer */}
      {selectedNft && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={() => setSelectedNft(null)}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${getRarityBadgeColor(selectedNft.rarity)}`} style={{ fontSize: '10px' }}>
                  {selectedNft.rarity}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {selectedNft.collection}
                </span>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSelectedNft(null)}
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Media Banner */}
            <div
              style={{
                width: '100%',
                height: '240px',
                background: 'var(--bg-subtle)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <img
                src={selectedNft.imageUrl}
                alt={selectedNft.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  {selectedNft.name}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {selectedNft.description}
                </p>
              </div>

              {/* Attributes / Traits */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Attributes & Traits ({selectedNft.attributes.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {selectedNft.attributes.map((attr, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        {attr.trait}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {attr.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical On-Chain Metadata */}
              <div
                style={{
                  padding: '12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">Asset Code</span>
                  <span className="font-mono" style={{ fontWeight: 600 }}>{selectedNft.code}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">Issuer Address</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="font-mono">{formatAddress(selectedNft.issuer, 5)}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => handleCopyIssuer(selectedNft.issuer)}
                      style={{ padding: '2px' }}
                    >
                      {copiedIssuer ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">Mint Date</span>
                  <span>{selectedNft.mintDate}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <a
                  href={`https://stellar.expert/explorer/${preferences.network}/asset/${selectedNft.code}-${selectedNft.issuer}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-lg"
                  style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <ExternalLink size={14} />
                  <span>Stellar Expert</span>
                </a>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setSelectedNft(null)}
                  style={{ flex: 1 }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
