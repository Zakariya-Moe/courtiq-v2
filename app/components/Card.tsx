'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

// ── Framer Motion variants ────────────────────────────────────
const cardVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  tap:     { scale: 0.975 },
  hover:   { borderColor: 'rgba(255,255,255,0.10)' },
};

// ── Props ─────────────────────────────────────────────────────
interface CardProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  /** Stagger delay in multiples of 60ms */
  index?: number;
  /** Disable press feedback (e.g. non-interactive cards) */
  interactive?: boolean;
  /** Surface level */
  surface?: 's1' | 's2' | 's3';
}

const surfaceBg: Record<string, string> = {
  s1: 'var(--s1)',
  s2: 'var(--s2)',
  s3: 'var(--s3)',
};

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { children, index = 0, interactive = true, surface = 's1', style, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileTap={interactive ? 'tap' : undefined}
      transition={{
        opacity:   { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
        y:         { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
        delay:     index * 0.06,
        scale:     { duration: 0.12, ease: [0.16, 1, 0.3, 1] },
      }}
      style={{
        background:   surfaceBg[surface],
        border:       '1px solid var(--b1)',
        borderRadius: 'var(--radius-lg)',
        position:     'relative',
        overflow:     'hidden',
        cursor:       interactive ? 'pointer' : 'default',
        userSelect:   'none',
        WebkitUserSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

Card.displayName = 'Card';
export default Card;
