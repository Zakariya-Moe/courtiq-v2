'use client';

import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
};

const pageTransition = {
  duration: 0.3,
  ease:     [0.16, 1, 0.3, 1] as [number, number, number, number],
};

interface PageWrapperProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  /** Two-column desktop pages need more horizontal space.
   *  wide=true → max 1100px on desktop, 680px on mobile (via media query logic).
   *  Scan surfaces (games list, hot page) stay at the default 680px. */
  wide?: boolean;
}

export default function PageWrapper({ children, style, wide = false }: PageWrapperProps) {
  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      style={{
        padding:       `12px var(--page-px) calc(var(--nav) + 16px + env(safe-area-inset-bottom, 0px))`,
        maxWidth:      wide ? 1100 : 680,
        margin:        '0 auto',
        minHeight:     '100vh',
        position:      'relative',
        width:         '100%',
        ...style,
      }}
    >
      {children}
    </motion.main>
  );
}

// ── Staggered list container ──────────────────────────────────
export const listVariants = {
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const listItemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export function StaggerList({
  children,
  style,
}: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.div
      variants={listVariants}
      initial="initial"
      animate="animate"
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  style,
}: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.div variants={listItemVariants} style={style}>
      {children}
    </motion.div>
  );
}
