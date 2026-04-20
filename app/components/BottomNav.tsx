'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const TABS = [
  {
    href:  '/games',
    label: 'Games',
    icon:  (on: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9.5"
          stroke={on ? 'var(--green)' : 'rgba(255,255,255,0.30)'} strokeWidth="1.5"/>
        <path d="M8.5 9.5c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5c0 2.5-3.5 5.5-3.5 5.5S8.5 12 8.5 9.5z"
          fill={on ? 'var(--green)' : 'rgba(255,255,255,0.30)'}/>
      </svg>
    ),
  },
  {
    href:  '/hot',
    label: 'Trending',
    icon:  (on: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 3C12 3 5 9 5 14a7 7 0 0014 0c0-2.5-2-5-4-7-1 2-2 3-3 3s-2-2-2-4c0 0 1-1.5 2-3z"
          fill={on ? 'var(--green)' : 'none'}
          stroke={on ? 'var(--green)' : 'rgba(255,255,255,0.30)'}
          strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {TABS.map(tab => {
          const on = path === tab.href || path.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.label}
              href={tab.href}
              style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                gap:            4,
                padding:        '6px 32px',
                position:       'relative',
              }}
            >
              <motion.div
                animate={{ y: on ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                {tab.icon(on)}
              </motion.div>
              <span style={{
                fontSize:   10,
                fontWeight: 600,
                letterSpacing: '0.02em',
                color:      on ? 'var(--green)' : 'rgba(255,255,255,0.30)',
                transition: 'color 0.15s ease',
              }}>
                {tab.label}
              </span>
              {/* Active indicator dot */}
              {on && (
                <motion.span
                  layoutId="nav-dot"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  style={{
                    position:     'absolute',
                    bottom:       -2,
                    width:        4,
                    height:       4,
                    borderRadius: '50%',
                    background:   'var(--green)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
