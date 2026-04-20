'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';

interface Tab {
  key: string;
  label: string;
  badge?: number;
  dot?: boolean;
}

interface FilterTabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export default function FilterTabs({ tabs, active, onChange }: FilterTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="scroll-x"
      style={{ gap: 6, paddingBottom: 0 }}
    >
      {tabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <motion.button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position:     'relative',
              display:      'inline-flex',
              alignItems:   'center',
              gap:          5,
              height:       32,
              padding:      '0 14px',
              borderRadius: 100,
              fontSize:     13,
              fontWeight:   600,
              letterSpacing: '-0.01em',
              border:       'none',
              cursor:       'pointer',
              flexShrink:   0,
              outline:      'none',
              WebkitUserSelect: 'none',
              userSelect:   'none',
              // Colors animate via framer
              color:        isActive ? 'var(--t1)' : 'var(--t3)',
              background:   isActive ? 'var(--s3)' : 'var(--s2)',
            }}
          >
            {/* Sliding background pill — layout animation */}
            {isActive && (
              <motion.span
                layoutId="filter-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                style={{
                  position:     'absolute',
                  inset:        0,
                  borderRadius: 100,
                  background:   'var(--s3)',
                  border:       '1px solid var(--b2)',
                  zIndex:       0,
                }}
              />
            )}
            {/* Content on top */}
            <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
              {tab.dot && (
                <motion.span
                  animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0.5, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--green)', flexShrink: 0,
                    display: 'block',
                  }}
                />
              )}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  style={{
                    background:   isActive ? 'rgba(0,0,0,0.25)' : 'var(--green)',
                    color:        isActive ? 'var(--t1)' : '#000',
                    borderRadius: 100,
                    padding:      '0 5px',
                    fontSize:     10,
                    fontWeight:   700,
                    lineHeight:   '16px',
                    minWidth:     16,
                    textAlign:    'center',
                  }}
                >
                  {tab.badge}
                </motion.span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
