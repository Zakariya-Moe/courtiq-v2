'use client';

import { motion } from 'framer-motion';

// ── Generic shimmer block ─────────────────────────────────────
export function SkeletonBlock({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }}
    />
  );
}

// ── Game card skeleton ────────────────────────────────────────
export function GameCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.06 }}
      style={{
        padding:      18,
        background:   'var(--s1)',
        border:       '1px solid var(--b1)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {/* Status row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <SkeletonBlock width={48} height={12} />
        <SkeletonBlock width={60} height={10} />
      </div>
      {/* Team rows */}
      {[0, 1].map(i => (
        <div key={i} style={{
          display:     'flex',
          alignItems:  'center',
          gap:         12,
          marginBottom: i === 0 ? 10 : 0,
        }}>
          <SkeletonBlock width={34} height={34} radius={9} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width={36} height={9} style={{ marginBottom: 5 }} />
            <SkeletonBlock width={100} height={13} />
          </div>
          <SkeletonBlock width={36} height={28} radius={6} />
        </div>
      ))}
      {/* Momentum bar */}
      <SkeletonBlock height={3} radius={2} style={{ marginTop: 14 }} />
    </motion.div>
  );
}

// ── Player row skeleton ───────────────────────────────────────
export function PlayerRowSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          14,
        padding:      '14px 0',
        borderBottom: '1px solid var(--b1)',
      }}
    >
      <SkeletonBlock width={32} height={32} radius={8} />
      <div style={{ flex: 1 }}>
        <SkeletonBlock width={120} height={13} style={{ marginBottom: 5 }} />
        <SkeletonBlock width={60} height={10} />
      </div>
      {[0, 1, 2].map(i => (
        <SkeletonBlock key={i} width={28} height={18} radius={4} />
      ))}
    </motion.div>
  );
}

// ── Chart skeleton ────────────────────────────────────────────
export function ChartSkeleton({ height = 120 }: { height?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        height,
        background: 'linear-gradient(180deg, var(--s2) 0%, var(--s1) 100%)',
        border:     '1px solid var(--b1)',
        borderRadius: 14,
        overflow:   'hidden',
        position:   'relative',
      }}
    >
      <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
      {/* Fake chart lines */}
      <svg
        width="100%" height="100%"
        style={{ position: 'absolute', inset: 0, opacity: 0.15 }}
      >
        {[0.3, 0.5, 0.7].map((y, i) => (
          <line key={i} x1="0" y1={`${y * 100}%`} x2="100%" y2={`${y * 100}%`}
            stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 8" />
        ))}
      </svg>
    </motion.div>
  );
}
