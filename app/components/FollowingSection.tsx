'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFavorites, hasFavorites } from '@/lib/user/favorites';
import { getHighPriorityEvents, type SignalEvent } from '@/lib/analytics/signal-events';
import { getSignalColor } from '@/lib/analytics/signals';
import { getTeam } from '@/lib/utils/teams';

interface FavCard {
  playerId: string;
  playerName: string;
  teamAbbr: string;
  event: SignalEvent | null;
}

function FavPill({ card, index }: { card: FavCard; index: number }) {
  const team   = getTeam(card.teamAbbr);
  const colors = card.event ? getSignalColor(card.event.signal.type) : null;

  return (
    <Link href={`/players/${card.playerId}`} style={{ display: 'block', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '10px 12px',
          borderRadius: 14,
          border: colors
            ? `1px solid ${colors.border}`
            : '1px solid var(--b1)',
          background: colors ? colors.bg : 'var(--s1)',
          minWidth: 76,
          cursor: 'pointer',
          transition: 'transform 0.15s var(--ease-out)',
          animation: `favIn 0.35s cubic-bezier(0.16,1,0.3,1) ${index * 50}ms both`,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.04)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
      >
        {/* Team badge */}
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: team.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{card.teamAbbr}</span>
        </div>

        {/* Name (last name only) */}
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--t2)',
          maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', textAlign: 'center',
        }}>
          {card.playerName.split(' ').pop()}
        </span>

        {/* Signal label or star */}
        {card.event ? (
          <span style={{
            fontSize: 9, fontWeight: 700, color: colors!.text,
            textAlign: 'center', lineHeight: 1.2,
          }}>
            {card.event.signal.label}
          </span>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)" stroke="none">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        )}
      </div>
      <style>{`
        @keyframes favIn {
          from { opacity: 0; transform: scale(0.88) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </Link>
  );
}

export default function FollowingSection() {
  const [cards, setCards] = useState<FavCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Run only on client — localStorage unavailable during SSR
    if (!hasFavorites()) { setLoaded(true); return; }

    const favIds = getFavorites();
    const events = getHighPriorityEvents(50);
    const eventMap = new Map(events.map(e => [e.playerId, e]));

    // We need names + teams for each favorite. Pull from signal events if available,
    // otherwise we only have the ID — skip those we can't name yet.
    const named: FavCard[] = [];
    for (const id of favIds) {
      const event = eventMap.get(id) ?? null;
      if (event) {
        named.push({ playerId: id, playerName: event.playerName, teamAbbr: event.teamAbbr, event });
      }
      // If no event for this player, we skip — we don't store name/team separately
      // (they'll appear once they get a signal or are viewed)
    }

    setCards(named);
    setLoaded(true);
  }, []);

  if (!loaded || cards.length === 0) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>Following</span>
        <span style={{ fontSize: 11, color: 'var(--t4)' }}>{cards.length} player{cards.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {cards.map((card, i) => (
          <FavPill key={card.playerId} card={card} index={i} />
        ))}
      </div>
    </div>
  );
}
