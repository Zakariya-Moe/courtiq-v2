'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  getHighPriorityEvents,
  fmtRelativeTime,
  type SignalEvent,
} from '@/lib/analytics/signal-events';
import { getFavorites } from '@/lib/user/favorites';
import { getSignalColor } from '@/lib/analytics/signals';
import { getTeam } from '@/lib/utils/teams';

interface Props {
  /** How many events to show */
  limit?: number;
  /** Poll interval in ms — default 15000 */
  refreshMs?: number;
}

function EventRow({ event, index, isFav }: { event: SignalEvent; index: number; isFav: boolean }) {
  const colors = getSignalColor(event.signal.type);
  const team   = getTeam(event.teamAbbr);

  return (
    <Link href={`/players/${event.playerId}`} style={{ display: 'block' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 14px',
          borderRadius: 12,
          border: `1px solid var(--b1)`,
          background: 'var(--s1)',
          cursor: 'pointer',
          transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.15s var(--ease-out)',
          // Staggered fade+slide in
          animation: `sigFeedIn 0.4s cubic-bezier(0.16,1,0.3,1) ${index * 55}ms both`,
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.background = 'var(--s2)';
          el.style.borderColor = 'var(--b2)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.background = 'var(--s1)';
          el.style.borderColor = 'var(--b1)';
        }}
      >
        {/* Team badge */}
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: team.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', letterSpacing: 0.2 }}>
            {event.teamAbbr}
          </span>
        </div>

        {/* Name + signal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            fontSize: 13, fontWeight: 600, color: 'var(--t1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {isFav && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#00C805" stroke="none" style={{ marginRight: 3, flexShrink: 0 }}>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            )}
            {event.playerName}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: colors.text, marginTop: 1,
          }}>
            {event.signal.label}
          </div>
        </div>

        {/* Confidence + timestamp */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: colors.text,
          }}>
            {event.signal.confidence}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>
            {fmtRelativeTime(event.timestamp)}
          </div>
        </div>

        <style>{`
          @keyframes sigFeedIn {
            from { opacity: 0; transform: translateX(-10px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    </Link>
  );
}

export default function SignalFeed({ limit = 8, refreshMs = 15000 }: Props) {
  const [events, setEvents] = useState<SignalEvent[]>([]);
  const [tick, setTick]     = useState(0);

  const refresh = useCallback(() => {
    const all = getHighPriorityEvents(limit * 2); // fetch extra to allow re-sort
    const favSet = new Set(getFavorites());
    if (favSet.size > 0) {
      // Favorites float to the top, then sort by timestamp
      const favEvents  = all.filter(e => favSet.has(e.playerId));
      const otherEvents = all.filter(e => !favSet.has(e.playerId));
      setEvents([...favEvents, ...otherEvents].slice(0, limit));
    } else {
      setEvents(all.slice(0, limit));
    }
  }, [limit]);

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  // Periodic refresh so timestamps stay accurate and new events surface
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  // Re-read store on each tick
  useEffect(() => { refresh(); }, [tick, refresh]);

  if (events.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>
            Signal Feed
          </span>
          {/* Live indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--green-10)', border: '1px solid var(--green-20)',
            borderRadius: 100, padding: '2px 8px',
          }}>
            <div className="live-dot" style={{ width: 5, height: 5 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)' }}>LIVE</span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--t4)' }}>
          {events.length} active
        </span>
      </div>

      {/* Event list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(() => {
          const favSet = new Set(getFavorites());
          return events.map((event, i) => (
            <EventRow key={event.id} event={event} index={i} isFav={favSet.has(event.playerId)} />
          ));
        })()}
      </div>
    </div>
  );
}
