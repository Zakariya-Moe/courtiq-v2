'use client';

import { useEffect, useRef, useState } from 'react';
import { type Signal, getSignalColor } from '@/lib/analytics/signals';
import { isHighPriority } from '@/lib/analytics/signal-diff';

interface Props {
  signal: Signal;
  size?: 'sm' | 'md';
  showDescription?: boolean;
  className?: string;
  isNew?: boolean;
}

// Session-level memory — glow fires once per signal key per session
const seenKeys = new Set<string>();
function getKey(signal: Signal) {
  return `${signal.type}:${Math.round(signal.confidence / 10) * 10}`;
}

export default function SignalBadge({
  signal, size = 'sm', showDescription = false, className, isNew,
}: Props) {
  const colors = getSignalColor(signal.type);
  const key = getKey(signal);
  const isFirstSeen = !seenKeys.has(key);
  const shouldGlow = (isNew || isFirstSeen) && isHighPriority(signal);

  const markedRef = useRef(false);
  useEffect(() => {
    if (!markedRef.current) {
      markedRef.current = true;
      seenKeys.add(key);
    }
  }, [key]);

  // Phase 8 §4: confidence bar animates from 0 → value on mount
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(signal.confidence), 80);
    return () => clearTimeout(t);
  }, [signal.confidence]);

  const STYLES = `
    @keyframes signalEnter {
      from { opacity: 0; transform: scale(0.93) translateY(4px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes signalGlow {
      0%   { box-shadow: 0 0 0 1px ${colors.border}, 0 0 0px 0 ${colors.bg}; }
      40%  { box-shadow: 0 0 0 1px ${colors.border}, 0 0 20px 4px ${colors.bg}; }
      100% { box-shadow: 0 0 0 1px ${colors.border}, 0 0 0px 0 ${colors.bg}; }
    }
    @keyframes signalPillEnter {
      from { opacity: 0; transform: scale(0.8); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes signalPillGlow {
      0%   { box-shadow: 0 0 0 0 ${colors.border}; transform: scale(1); }
      35%  { box-shadow: 0 0 8px 2px ${colors.bg}; transform: scale(1.05); }
      100% { box-shadow: 0 0 0 0 transparent; transform: scale(1); }
    }
  `;

  if (size === 'md') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: '12px 14px',
          animation: shouldGlow
            ? 'signalEnter 0.5s cubic-bezier(0.34,1.56,0.64,1) both, signalGlow 1.2s ease 0.5s 1'
            : 'signalEnter 0.4s cubic-bezier(0.16,1,0.3,1) both',
          boxShadow: shouldGlow
            ? `0 0 0 1px ${colors.border}, 0 0 14px 0 ${colors.bg}`
            : 'none',
        }}
      >
        <style>{STYLES}</style>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: showDescription ? 3 : 0 }}>
            {signal.label}
          </div>
          {showDescription && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {signal.description}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 4 }}>
            {signal.confidence}%
          </div>
          <div style={{ width: 48, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${barWidth}%`,
              background: colors.text,
              borderRadius: 2,
              transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
        </div>
      </div>
    );
  }

  // sm — inline pill
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 100,
        padding: '3px 9px',
        fontSize: 11,
        fontWeight: 700,
        color: colors.text,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        animation: shouldGlow
          ? 'signalPillEnter 0.4s cubic-bezier(0.34,1.56,0.64,1) both, signalPillGlow 1.2s ease 0.4s 1'
          : 'signalPillEnter 0.3s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <style>{STYLES}</style>
      {signal.label}
    </span>
  );
}
