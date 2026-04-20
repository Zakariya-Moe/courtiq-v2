'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    href: '/games',
    label: 'Games',
    icon: (on: boolean) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9.5" stroke={on ? '#00C805' : 'rgba(255,255,255,0.35)'} strokeWidth="1.6"/>
        <path d="M8.5 9.5c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5c0 2.5-3.5 5.5-3.5 5.5S8.5 12 8.5 9.5z"
          fill={on ? '#00C805' : 'rgba(255,255,255,0.35)'}/>
      </svg>
    ),
  },
  {
    href: '/hot',
    label: 'Trending',
    icon: (on: boolean) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
        <path d="M12 3C12 3 5 9 5 14a7 7 0 0014 0c0-2.5-2-5-4-7-1 2-2 3-3 3s-2-2-2-4c0 0 1-1.5 2-3z"
          fill={on ? '#00C805' : 'none'}
          stroke={on ? '#00C805' : 'rgba(255,255,255,0.35)'}
          strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/games',
    label: 'Watch',
    icon: (_on: boolean) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="3" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6"/>
        <path d="M10 9l5 3-5 3V9z" fill="rgba(255,255,255,0.35)"/>
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
        const on = path === tab.href || (tab.href === '/hot' && path.startsWith('/hot'));
        return (
          <Link
            key={tab.label}
            href={tab.href}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, padding: '6px 24px',
              transition: 'opacity 0.15s ease',
            }}
          >
            {tab.icon(on)}
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
              color: on ? '#00C805' : 'rgba(255,255,255,0.35)',
              transition: 'color 0.15s ease',
            }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
