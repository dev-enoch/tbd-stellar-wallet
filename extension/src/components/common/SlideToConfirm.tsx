import React, { useState, useRef, useEffect } from 'react';
import { ChevronsRight, Loader2, Check } from 'lucide-react';

export interface SlideToConfirmProps {
  label: string;
  loadingLabel?: string;
  successLabel?: string;
  disabledLabel?: string;
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'accent' | 'danger' | 'success';
  className?: string;
  style?: React.CSSProperties;
  height?: number;
  autoResetDelay?: number;
}

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  label,
  loadingLabel = 'Processing…',
  successLabel = 'Confirmed!',
  disabledLabel,
  onConfirm,
  isLoading = false,
  isSuccess = false,
  disabled = false,
  variant = 'primary',
  className = '',
  style = {},
  height = 52,
  autoResetDelay = 1800,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const [trackWidth, setTrackWidth] = useState<number>(320);
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);

  const thumbSize = height - 8; // 4px margin top/bottom
  const padding = 4;
  const maxDrag = Math.max(0, trackWidth - thumbSize - padding * 2);

  // Measure track width accurately and on resize
  useEffect(() => {
    const updateWidth = () => {
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setTrackWidth(rect.width);
        }
      }
    };

    updateWidth();
    const ro = new ResizeObserver(() => updateWidth());
    if (trackRef.current) ro.observe(trackRef.current);

    window.addEventListener('resize', updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Handle external loading and error states
  useEffect(() => {
    if (!isLoading && !isSuccess && isConfirmed) {
      // Operation finished without success (e.g. error thrown)
      setShake(true);
      const timer = setTimeout(() => {
        setShake(false);
        setIsConfirmed(false);
        setDragX(0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isSuccess, isConfirmed]);

  // Handle external success auto-reset (if needed)
  useEffect(() => {
    if (isSuccess && autoResetDelay > 0) {
      const timer = setTimeout(() => {
        setIsConfirmed(false);
        setDragX(0);
      }, autoResetDelay);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, autoResetDelay]);

  // Pointer event handlers with pointer capture for buttery smooth dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isLoading || isConfirmed || isSuccess) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // fallback if capture not supported
    }

    setIsDragging(true);
    // Record starting offset
    const currentX = e.clientX;
    const initialThumbLeft = dragX;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - currentX;
      const nextX = Math.max(0, Math.min(maxDrag, initialThumbLeft + deltaX));
      setDragX(nextX);
    };

    const handlePointerUp = (upEv: PointerEvent) => {
      try {
        e.currentTarget.releasePointerCapture(upEv.pointerId);
      } catch {
        // ignore
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      setIsDragging(false);

      // Check if threshold reached (80% of max drag distance)
      setDragX((currentDrag) => {
        const threshold = maxDrag * 0.8;
        if (currentDrag >= threshold) {
          // Snap to 100%
          setIsConfirmed(true);
          try {
            if ('vibrate' in navigator) {
              navigator.vibrate?.([30, 20, 50]);
            }
          } catch {
            // ignore vibrate errors
          }
          // Fire confirmation
          setTimeout(() => {
            onConfirm();
          }, 60);
          return maxDrag;
        } else {
          // Smooth spring snap back to 0
          return 0;
        }
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Keyboard accessibility: ArrowRight, Enter, or Space triggers smooth animated slide
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || isLoading || isConfirmed || isSuccess) return;

    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsConfirmed(true);
      setDragX(maxDrag);
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate?.([30, 20, 50]);
        }
      } catch {
        // ignore
      }
      setTimeout(() => {
        onConfirm();
      }, 200);
    }
  };

  const progress = maxDrag > 0 ? Math.min(1, Math.max(0, dragX / maxDrag)) : 0;
  const isBusy = isLoading || isConfirmed;
  const displayText = disabled
    ? disabledLabel || label
    : isSuccess
    ? successLabel
    : isBusy
    ? loadingLabel
    : label;

  // Calculate dynamic fill width
  const fillWidth = isConfirmed || isSuccess || isLoading
    ? '100%'
    : `${dragX + thumbSize / 2 + padding}px`;

  return (
    <div
      className={`slide-confirm-container ${shake ? 'slide-shake' : ''} ${className}`}
      style={{
        ...style,
        position: 'relative',
        width: '100%',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div
        ref={trackRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled || isBusy}
        onKeyDown={handleKeyDown}
        className={`slide-confirm-track ${disabled ? 'disabled' : ''} ${
          variant === 'danger' ? 'danger' : ''
        }`}
        style={{
          height: `${height}px`,
          position: 'relative',
          borderRadius: `${height}px`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          background:
            variant === 'danger'
              ? 'rgba(239, 68, 68, 0.08)'
              : 'var(--bg-surface)',
          border:
            variant === 'danger'
              ? '1px solid rgba(239, 68, 68, 0.3)'
              : '1px solid var(--border-subtle)',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
          cursor: disabled ? 'not-allowed' : 'default',
        }}
      >
        {/* Dynamic Trail / Fill */}
        <div
          className={`slide-confirm-fill ${variant === 'danger' ? 'danger' : ''}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: fillWidth,
            borderRadius: `${height}px`,
            background:
              variant === 'danger'
                ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.5) 100%)'
                : 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.55) 100%)',
            transition: isDragging ? 'none' : 'width 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            pointerEvents: 'none',
          }}
        />

        {/* Center Label with Shimmer */}
        <div
          className="slide-confirm-label-wrapper"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            padding: `0 ${thumbSize + 12}px`,
            opacity: isBusy || isSuccess || disabled ? 1 : Math.max(0, 1 - progress * 1.5),
            transform: isBusy || isSuccess || disabled ? 'none' : `translateX(${progress * 12}px)`,
            transition: isDragging ? 'opacity 0.05s linear' : 'all 0.25s ease',
          }}
        >
          <span
            className={`slide-confirm-label ${disabled ? 'text-muted' : ''}`}
            style={{
              fontSize: '13.5px',
              fontWeight: 600,
              letterSpacing: '0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: disabled
                ? 'var(--text-tertiary)'
                : isSuccess
                ? 'var(--success)'
                : variant === 'danger'
                ? 'var(--danger)'
                : 'var(--text-primary)',
            }}
          >
            {isBusy ? (
              <>
                <Loader2 size={15} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <span>{displayText}</span>
              </>
            ) : isSuccess ? (
              <>
                <Check size={16} style={{ color: 'var(--success)' }} />
                <span>{displayText}</span>
              </>
            ) : (
              <>
                <span>{displayText}</span>
                {!disabled && (
                  <span className="slide-chevron-shimmer" style={{ display: 'inline-flex', opacity: 0.8 }}>
                    <ChevronsRight size={15} />
                  </span>
                )}
              </>
            )}
          </span>
        </div>

        {/* Draggable Thumb Knob */}
        {!disabled && (
          <div
            ref={thumbRef}
            onPointerDown={handlePointerDown}
            className={`slide-confirm-thumb ${isDragging ? 'dragging' : ''} ${
              isConfirmed || isSuccess ? 'completed' : ''
            } ${variant === 'danger' ? 'danger' : ''}`}
            style={{
              position: 'absolute',
              top: `${padding}px`,
              left: `${padding}px`,
              width: `${thumbSize}px`,
              height: `${thumbSize}px`,
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                isConfirmed || isSuccess
                  ? 'var(--success)'
                  : variant === 'danger'
                  ? 'var(--danger)'
                  : 'var(--text-primary)',
              color:
                isConfirmed || isSuccess || variant === 'danger'
                  ? '#ffffff'
                  : 'var(--text-inverse)',
              boxShadow: isDragging
                ? '0 6px 18px rgba(0, 0, 0, 0.45), 0 0 0 4px rgba(59, 130, 246, 0.25)'
                : '0 4px 12px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.15)',
              transform: `translate3d(${isConfirmed || isSuccess ? maxDrag : dragX}px, 0, 0)`,
              transition: isDragging
                ? 'none'
                : 'transform 0.36s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.2s ease, box-shadow 0.2s ease',
              cursor: isBusy || isSuccess ? 'default' : isDragging ? 'grabbing' : 'grab',
              zIndex: 3,
            }}
          >
            {isBusy ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isSuccess ? (
              <Check size={18} />
            ) : (
              <ChevronsRight size={18} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
