'use client';

import { motion } from 'framer-motion';

interface StatPillProps {
  label: string;
  value: string | number;
  /** Optional color accent for the value */
  accent?: string;
  /** Animation delay in seconds */
  delay?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { value: 18, label: 9,  padding: '8px 12px',  radius: 10, gap: 3  },
  md: { value: 24, label: 10, padding: '12px 16px', radius: 14, gap: 4  },
  lg: { value: 32, label: 10, padding: '16px 20px', radius: 16, gap: 5  },
};

export default function StatPill({
  label, value, accent, delay = 0, size = 'md',
}: StatPillProps) {
  const s = sizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            s.gap,
        padding:        s.padding,
        background:     'var(--s2)',
        border:         '1px solid var(--b1)',
        borderRadius:   s.radius,
        flex:           1,
        minWidth:       0,
      }}
    >
      <span style={{
        fontSize:      s.value,
        fontWeight:    700,
        letterSpacing: '-0.03em',
        color:         accent ?? 'var(--t1)',
        fontVariantNumeric: 'tabular-nums',
        lineHeight:    1,
      }}>
        {value}
      </span>
      <span style={{
        fontSize:       s.label,
        fontWeight:     700,
        letterSpacing:  '0.06em',
        textTransform:  'uppercase',
        color:          'var(--t4)',
        whiteSpace:     'nowrap',
      }}>
        {label}
      </span>
    </motion.div>
  );
}

// ── Row wrapper for a group of pills ─────────────────────────
export function StatPillRow({
  children, style,
}: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', gap: 8, ...style }}>
      {children}
    </div>
  );
}
