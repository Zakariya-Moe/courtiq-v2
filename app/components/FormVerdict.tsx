'use client';

import { motion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber';

// ─────────────────────────────────────────────────────────────
// FORM VERDICT SYSTEM
// Derives a human-readable verdict + visual language from signal
// output and last-N performance vs season baseline.
// ─────────────────────────────────────────────────────────────

export type VerdictTheme = {
  label:    string;
  color:    string;
  bg:       string;
  border:   string;
  barColor: (perfRatio: number) => string;
};

export type SignalKind = 'hot' | 'breakout' | 'consistent' | 'cold' | 'declining' | null;

export function getVerdictTheme(signalType: SignalKind, deltaPct: number): VerdictTheme {
  if (signalType === 'breakout' || signalType === 'hot' || deltaPct >= 15) {
    return {
      label:    '🔥 Hot Streak',
      color:    '#00C805',
      bg:       'rgba(0,200,5,0.13)',
      border:   'rgba(0,200,5,0.28)',
      barColor: (r) => r >= 1.0 ? '#00C805' : r >= 0.75 ? '#00C80555' : 'rgba(255,255,255,0.10)',
    };
  }
  if (deltaPct >= 5) {
    return {
      label:    '📈 Trending Up',
      color:    '#4ade80',
      bg:       'rgba(74,222,128,0.11)',
      border:   'rgba(74,222,128,0.24)',
      barColor: (r) => r >= 0.9 ? '#4ade80' : r >= 0.7 ? '#4ade8055' : 'rgba(255,255,255,0.10)',
    };
  }
  if (signalType === 'cold' || signalType === 'declining' || deltaPct <= -15) {
    return {
      label:    '❄️ Cold Streak',
      color:    '#64B4FF',
      bg:       'rgba(100,180,255,0.11)',
      border:   'rgba(100,180,255,0.24)',
      barColor: (r) => r <= 0.75 ? '#64B4FF' : 'rgba(255,255,255,0.10)',
    };
  }
  if (deltaPct <= -5) {
    return {
      label:    '📉 Fading',
      color:    '#fb923c',
      bg:       'rgba(251,146,60,0.11)',
      border:   'rgba(251,146,60,0.24)',
      barColor: (r) => r >= 0.9 ? '#fb923c99' : 'rgba(255,255,255,0.12)',
    };
  }
  return {
    label:    '📊 Steady',
    color:    'rgba(255,255,255,0.55)',
    bg:       'rgba(255,255,255,0.055)',
    border:   'rgba(255,255,255,0.10)',
    barColor: (_r) => 'rgba(255,255,255,0.18)',
  };
}

// ── Mini bar chart — last 5 games, colored vs baseline ────────
function MiniBarChart({
  games,
  baseline,
  barColorFn,
}: {
  games:      { pts: number }[];
  baseline:   number;
  barColorFn: (ratio: number) => string;
}) {
  if (!games.length || baseline === 0) return null;

  // Up to 5 games, chronological (oldest → newest = left → right)
  const recent = [...games].slice(0, 5).reverse();
  const max    = Math.max(...recent.map(g => g.pts), baseline * 1.4, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 36 }}>
      {recent.map((g, i) => {
        const heightPct = g.pts / max;
        const perfRatio = baseline > 0 ? g.pts / baseline : 1;
        const barH      = Math.max(Math.round(heightPct * 36), 3);
        const color     = barColorFn(perfRatio);

        return (
          <motion.div
            key={i}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{
              duration: 0.4,
              ease:     [0.16, 1, 0.3, 1],
              delay:    0.12 + i * 0.07,
            }}
            title={`${g.pts} PTS`}
            style={{
              flex:            1,
              height:          barH,
              background:      color,
              borderRadius:    '3px 3px 2px 2px',
              transformOrigin: 'bottom',
              minWidth:        0,
            }}
          />
        );
      })}
    </div>
  );
}

// ── FormVerdict — the "answer" panel ─────────────────────────
interface FormVerdictProps {
  theme:     VerdictTheme;
  deltaPct:  number;
  baseline:  number;
  recentAvg: number;
  games:     { pts: number }[];
}

export default function FormVerdict({
  theme, deltaPct, baseline, recentAvg, games,
}: FormVerdictProps) {
  const absDelta = Math.abs(deltaPct);
  const isUp     = deltaPct >= 0;
  const n        = Math.min(games.length, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1,  y: 0,   scale: 1    }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
      style={{
        background:   theme.bg,
        border:       `1px solid ${theme.border}`,
        borderRadius: 14,
        padding:      '16px 16px 14px 20px',
        marginBottom: 20,
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Left accent bar — the strongest visual anchor */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
        style={{
          position:        'absolute',
          left:            0,
          top:             0,
          bottom:          0,
          width:           4,
          background:      theme.color,
          transformOrigin: 'top',
          borderRadius:    '14px 0 0 14px',
        }}
      />

      {/* Top row: verdict text + delta number */}
      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        marginBottom:   14,
        gap:            12,
      }}>
        {/* Left: verdict label only — delta carries the meaning */}
        <div style={{ minWidth: 0 }}>
          <span style={{
            fontFamily:    'var(--font-display)',
            fontSize:      20,
            fontWeight:    700,
            letterSpacing: '-0.03em',
            color:         theme.color,
            display:       'block',
            lineHeight:    1.05,
          }}>
            {theme.label}
          </span>
        </div>

        {/* Right: delta — the dominant number, reads first */}
        {absDelta >= 1 && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22, delay: 0.16 }}
            style={{ textAlign: 'right', flexShrink: 0 }}
          >
            <div style={{
              fontFamily:         'var(--font-display)',
              fontSize:           36,
              fontWeight:         700,
              letterSpacing:      '-0.05em',
              color:              theme.color,
              lineHeight:         1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {isUp ? '+' : '−'}{absDelta.toFixed(1)}%
            </div>
            <div style={{
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color:         'rgba(255,255,255,0.25)',
              marginTop:     4,
              textAlign:     'right',
            }}>
              vs baseline
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom row: bar chart + context stat */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        {/* Mini bars */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <MiniBarChart
            games={games}
            baseline={baseline}
            barColorFn={theme.barColor}
          />
          <div style={{
            marginTop:     5,
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color:         'rgba(255,255,255,0.2)',
          }}>
            Last {n}G · oldest → newest
          </div>
        </div>

        {/* Recent avg + baseline */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily:         'var(--font-display)',
            fontSize:           26,
            fontWeight:         700,
            letterSpacing:      '-0.04em',
            color:              theme.color,
            lineHeight:         1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            <AnimatedNumber value={recentAvg} decimals={1} duration={750} mode="spring" />
          </div>
          <div style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color:         'rgba(255,255,255,0.22)',
            marginTop:     3,
          }}>
            Recent avg
          </div>
          {baseline > 0 && (
            <div style={{
              fontSize:   10,
              fontWeight: 500,
              color:      'rgba(255,255,255,0.2)',
              marginTop:  2,
            }}>
              baseline {baseline.toFixed(1)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
