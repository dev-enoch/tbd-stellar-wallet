import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchHistoricalChartData, ChartPoint, getAssetPriceInfo } from '../../services/market';
import { CURRENCY_RATES } from '../../services/history';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

export interface PriceChartProps {
  assetCode?: string; // 'XLM', 'USDC', 'EURC', etc. Or 'PORTFOLIO'
  currency?: 'USD' | 'EUR' | 'NGN' | 'GBP';
  height?: number;
  showTimeframes?: boolean;
  interactive?: boolean;
  onPriceHover?: (price: number | null) => void;
}

type TimeframeOption = '24H' | '7D' | '30D' | '1Y';

const TIMEFRAME_DAYS: Record<TimeframeOption, number> = {
  '24H': 1,
  '7D': 7,
  '30D': 30,
  '1Y': 365,
};

export const PriceChart: React.FC<PriceChartProps> = ({
  assetCode = 'XLM',
  currency = 'USD',
  height = 180,
  showTimeframes = true,
  interactive = true,
  onPriceHover,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('7D');
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(320);

  const currencyInfo = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
  const rate = currencyInfo.rateFromUsd;

  // Responsive width detection
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(Math.max(260, containerRef.current.clientWidth));
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch real chart data on assetCode or timeframe change
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const days = TIMEFRAME_DAYS[timeframe];
    fetchHistoricalChartData(assetCode, days)
      .then((data) => {
        if (!isCancelled) {
          setPoints(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [assetCode, timeframe]);

  // Derived metrics
  const { minPrice, maxPrice, endPrice, changePct, isPositive } = useMemo(() => {
    if (!points || points.length === 0) {
      const base = getAssetPriceInfo(assetCode).priceInUsd;
      return {
        minPrice: base * 0.98,
        maxPrice: base * 1.02,
        startPrice: base,
        endPrice: base,
        changeAmount: 0,
        changePct: 0,
        isPositive: true,
      };
    }

    const prices = points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const start = points[0].price;
    const end = points[points.length - 1].price;
    const chg = end - start;
    const pct = start > 0 ? (chg / start) * 100 : 0;

    return {
      minPrice: min,
      maxPrice: max,
      startPrice: start,
      endPrice: end,
      changeAmount: chg,
      changePct: pct,
      isPositive: chg >= 0,
    };
  }, [points, assetCode]);

  // Current active display price (either hovered point or current latest)
  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;
  const displayPriceUsd = activePoint ? activePoint.price : endPrice;
  const displayPriceFiat = displayPriceUsd * rate;

  // Notify parent of hover
  useEffect(() => {
    if (onPriceHover) {
      onPriceHover(activePoint ? displayPriceFiat : null);
    }
  }, [activePoint, displayPriceFiat, onPriceHover]);

  // SVG coordinate calculations
  const { pathD, areaD, plottedPoints } = useMemo(() => {
    if (points.length < 2) return { pathD: '', areaD: '', plottedPoints: [] };

    const paddingX = 4;
    const paddingTop = 12;
    const paddingBottom = 16;
    const plotWidth = containerWidth - paddingX * 2;
    const plotHeight = height - paddingTop - paddingBottom;
    const priceRange = maxPrice - minPrice || 0.0001;

    const coords = points.map((pt, idx) => {
      const x = paddingX + (idx / (points.length - 1)) * plotWidth;
      const normalized = (pt.price - minPrice) / priceRange;
      const y = paddingTop + (1 - normalized) * plotHeight;
      return { x, y, pt, idx };
    });

    // Build smooth line path
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      // Catmull-Rom or bezier curve control points
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Build closed area path for gradient
    const bottomY = height - 2;
    const area = `${d} L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`;

    return { pathD: d, areaD: area, plottedPoints: coords };
  }, [points, containerWidth, height, minPrice, maxPrice]);

  // Handle Mouse / Touch move over chart
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || plottedPoints.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closestIdx = 0;
    let closestDist = Infinity;
    plottedPoints.forEach((p, idx) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const strokeColor = isPositive ? 'var(--success)' : 'var(--danger)';
  const gradientId = `chart_grad_${assetCode}_${isPositive ? 'up' : 'down'}`;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Chart Top Metrics Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {currencyInfo.symbol}
              {displayPriceFiat.toLocaleString(undefined, {
                minimumFractionDigits: displayPriceFiat < 0.1 ? 4 : 2,
                maximumFractionDigits: displayPriceFiat < 0.1 ? 4 : 2,
              })}
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                fontWeight: 600,
                color: isPositive ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>
                {isPositive ? '+' : ''}
                {changePct.toFixed(2)}% ({timeframe})
              </span>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '8px' }}>
            {activePoint ? (
              <span>
                {new Date(activePoint.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ) : (
              <span>
                Low: {currencyInfo.symbol}{(minPrice * rate).toFixed(displayPriceFiat < 0.1 ? 4 : 2)} • High:{' '}
                {currencyInfo.symbol}{(maxPrice * rate).toFixed(displayPriceFiat < 0.1 ? 4 : 2)}
              </span>
            )}
          </div>
        </div>

        {/* Timeframe Buttons */}
        {showTimeframes && (
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: 'var(--bg-subtle)',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {(['24H', '7D', '30D', '1Y'] as TimeframeOption[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontWeight: timeframe === tf ? 700 : 500,
                  borderRadius: '4px',
                  border: 'none',
                  background: timeframe === tf ? 'var(--bg-surface)' : 'transparent',
                  color: timeframe === tf ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: timeframe === tf ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main SVG Plot Canvas */}
      <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(var(--bg-surface-rgb, 18,18,18), 0.5)',
              zIndex: 3,
            }}
          >
            <Loader2 size={18} className="animate-spin text-muted" />
          </div>
        )}

        <svg
          width={containerWidth}
          height={height}
          style={{ width: '100%', height: `${height}px`, overflow: 'visible', cursor: interactive ? 'crosshair' : 'default' }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.28} />
              <stop offset="85%" stopColor={strokeColor} stopOpacity={0.02} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Area under curve */}
          {areaD && <path d={areaD} fill={`url(#${gradientId})`} />}

          {/* Price Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Crosshair indicator when hovering */}
          {hoverIndex !== null && plottedPoints[hoverIndex] && (
            <g>
              {/* Vertical Guide Line */}
              <line
                x1={plottedPoints[hoverIndex].x}
                y1={6}
                x2={plottedPoints[hoverIndex].x}
                y2={height - 10}
                stroke="var(--border-focus)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {/* Active Point Circle */}
              <circle
                cx={plottedPoints[hoverIndex].x}
                cy={plottedPoints[hoverIndex].y}
                r={4.5}
                fill="var(--bg-surface)"
                stroke={strokeColor}
                strokeWidth={2.5}
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
