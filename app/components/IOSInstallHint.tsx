'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ciq_install_dismissed';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

function hasDismissed(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; }
  catch { return false; }
}

function setDismissed(): void {
  try { localStorage.setItem(STORAGE_KEY, '1'); }
  catch { /* storage blocked */ }
}

export default function IOSInstallHint() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding]   = useState(false);

  useEffect(() => {
    // Show only on iOS Safari, not already installed, not already dismissed
    if (isIOS() && !isInStandaloneMode() && !hasDismissed()) {
      // Delay slightly so it doesn't appear on every page load immediately
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    setHiding(true);
    setDismissed();
    setTimeout(() => setVisible(false), 350);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(var(--nav) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 420,
        zIndex: 300,
        animation: hiding
          ? 'hintOut 0.35s cubic-bezier(0.4,0,1,1) both'
          : 'hintIn 0.45s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <style>{`
        @keyframes hintIn {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes hintOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(12px); }
        }
      `}</style>

      <div style={{
        background: 'rgba(22,22,22,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 18,
        padding: '14px 16px 14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        {/* Basketball icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: '#000',
          border: '1px solid rgba(0,200,5,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 1,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#00C805" strokeWidth="1.5"/>
            <path d="M12 3 Q14.5 7.5 14.5 12 Q14.5 16.5 12 21" stroke="#00C805" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            <path d="M12 3 Q9.5 7.5 9.5 12 Q9.5 16.5 12 21" stroke="#00C805" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            <line x1="3" y1="12" x2="21" y2="12" stroke="#00C805" strokeWidth="1.2"/>
          </svg>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: -0.2 }}>
            Add CourtIQ to your home screen
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            Tap{' '}
            {/* iOS Share icon inline */}
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              verticalAlign: 'middle', margin: '0 2px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                <polyline points="16,6 12,2 8,6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </span>
            {' '}then{' '}
            <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
              "Add to Home Screen"
            </span>
            {' '}for the full app experience.
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            flexShrink: 0,
            width: 24, height: 24,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            marginTop: 1,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <line x1="1" y1="1" x2="11" y2="11" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="11" y1="1" x2="1" y2="11" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Downward arrow pointing at the nav bar area */}
      <div style={{
        width: 0, height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '8px solid rgba(22,22,22,0.97)',
        margin: '0 auto',
        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))',
      }} />
    </div>
  );
}
