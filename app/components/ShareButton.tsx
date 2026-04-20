'use client';

import { useState } from 'react';

interface SharePayload {
  title: string;
  text: string;
  url: string;
}

interface Props {
  payload: SharePayload;
  /** Optional label — defaults to icon only */
  label?: string;
}

type ShareState = 'idle' | 'copied' | 'error';

export default function ShareButton({ payload, label }: Props) {
  const [state, setState] = useState<ShareState>('idle');

  async function handleShare() {
    // Web Share API — works on iOS Safari, Android Chrome, some desktop Chrome
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(payload);
        return; // native sheet handled it — no UI feedback needed
      } catch (err: unknown) {
        // User cancelled (AbortError) — silent
        if (err instanceof Error && err.name === 'AbortError') return;
        // Other error — fall through to clipboard
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(payload.url);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }

  const isCopied = state === 'copied';
  const isError  = state === 'error';

  return (
    <button
      onClick={handleShare}
      aria-label="Share"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: label ? '7px 14px' : '8px 10px',
        borderRadius: 100,
        border: '1px solid var(--b2)',
        background: isCopied ? 'var(--green-10)' : 'transparent',
        color: isCopied ? 'var(--green)' : isError ? 'var(--red)' : 'var(--t2)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
        borderColor: isCopied ? 'var(--green-20)' : isError ? 'var(--red-20)' : 'var(--b2)',
      }}
    >
      {isCopied ? (
        // Checkmark
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      ) : isError ? (
        // X
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      ) : (
        // Share icon (iOS-style upload arrow)
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
          <polyline points="16,6 12,2 8,6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      )}
      {label && (
        <span>{isCopied ? 'Copied!' : isError ? 'Failed' : label}</span>
      )}
    </button>
  );
}
