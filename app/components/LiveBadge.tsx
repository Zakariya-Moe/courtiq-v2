'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface LiveBadgeProps {
  count?: number;
  size?: 'sm' | 'md';
}

export default function LiveBadge({ count, size = 'md' }: LiveBadgeProps) {
  const isSm = size === 'sm';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          isSm ? 4 : 5,
        background:   'var(--green-10)',
        border:       '1px solid var(--green-20)',
        borderRadius: 100,
        padding:      isSm ? '3px 8px' : '4px 10px',
      }}
    >
      <motion.span
        animate={{ opacity: [1, 0.35, 1], scale: [1, 0.8, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          display:      'block',
          width:        isSm ? 5 : 6,
          height:       isSm ? 5 : 6,
          borderRadius: '50%',
          background:   'var(--green)',
          flexShrink:   0,
        }}
      />
      <span style={{
        fontSize:      isSm ? 10 : 11,
        fontWeight:    700,
        color:         'var(--green)',
        letterSpacing: '0.04em',
        lineHeight:    1,
      }}>
        {count !== undefined ? `${count} LIVE` : 'LIVE'}
      </span>
    </motion.div>
  );
}
