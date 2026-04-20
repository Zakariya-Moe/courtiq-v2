'use client';

import { useEffect, useState } from 'react';
import { computeFreshness, freshnessColors, type FreshnessState } from '@/lib/analytics/freshness';

interface Props {
  games: any[];
}

export default function FreshnessBar({ games }: Props) {
  const [state, setState] = useState<FreshnessState | null>(null);

  // Recompute every 15s so the label ticks forward
  useEffect(() => {
    const compute = () => setState(computeFreshness(games));
    compute();
    const id = setInterval(compute, 15_000);
    return () => clearInterval(id);
  }, [games]);

  // Don't render until we've computed, and suppress when not warranted
  if (!state || !state.shouldWarn) return null;

  const colors  = freshnessColors(state.level);
  const isDead  = state.level === 'dead';
  const isStale = state.level === 'stale';

  const message = isDead
    ? 'Live data not updating — scores may be outdated'
    : isStale
    ? `Data delayed · ${state.ageLabel}`
    : `Updated ${state.ageLabel}`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 10,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        marginBottom: 14,
        animation: 'fadeUp 0.4s var(--ease-out) both',
      }}
    >
      {/* Pulsing dot */}
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: colors.dot, flexShrink: 0,
        animation: isDead ? 'none' : 'livePulse 2s ease-in-out infinite',
      }} />

      {/* Message */}
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        color: colors.text,
        letterSpacing: 0.1,
        flex: 1,
      }}>
        {message}
      </span>

      {/* Dead state: retry hint */}
      {isDead && (
        <button
          onClick={() => window.location.reload()}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.text,
            background: colors.border,
            border: 'none',
            borderRadius: 6,
            padding: '3px 9px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
