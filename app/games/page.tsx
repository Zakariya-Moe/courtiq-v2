'use client';

import useSWR from 'swr';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { getTeam } from '@/lib/utils/teams';
import AnimatedNumber from '../components/AnimatedNumber';
import PageWrapper from '../components/PageWrapper';
import SignalFeed from '../components/SignalFeed';
import FollowingSection from '../components/FollowingSection';
import FreshnessBar from '../components/FreshnessBar';
import SearchBar from '../components/SearchBar';
import LastUpdated from '../components/LastUpdated';

type Game = {
  id: string; home_team: string; away_team: string;
  home_score: number; away_score: number; status: string; last_updated: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'live',      label: 'Live' },
  { key: 'final',     label: 'Final' },
  { key: 'scheduled', label: 'Upcoming' },
] as const;
type FK = typeof FILTERS[number]['key'];

function TeamLine({
  abbr, score, isWinner, isLive,
}: { abbr: string; score: number; isWinner: boolean; isLive: boolean }) {
  const t = getTeam(abbr);
  const prevScore = useRef(score);
  const [flash, setFlash] = useState(false);

  // Flash when score increases during a live game
  if (isLive && score > prevScore.current) {
    prevScore.current = score;
    if (!flash) {
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
    }
  } else if (!isLive) {
    prevScore.current = score;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Team badge */}
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: t.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: 0.2 }}>{abbr}</span>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500, marginBottom: 1 }}>{t.city}</div>
          <div style={{
            fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
            color: isWinner ? 'var(--t1)' : 'var(--t3)',
          }}>{t.name}</div>
        </div>
      </div>
      <div style={{
        fontSize: 30, fontWeight: 700, letterSpacing: -1,
        color: flash ? 'var(--green)' : isWinner ? 'var(--t1)' : 'var(--t3)',
        fontVariantNumeric: 'tabular-nums',
        transition: 'color 0.6s ease',
        animation: flash ? 'scoreFlash 0.7s ease both' : 'none',
      }}>
        {isLive ? <AnimatedNumber value={score} duration={500} /> : score}
      </div>
    </div>
  );
}

function GameCard({ game, index }: { game: Game; index: number }) {
  const isLive  = game.status === 'in_progress';
  const isFinal = game.status === 'final';
  const homeWins = isFinal && game.home_score > game.away_score;
  const awayWins = isFinal && game.away_score > game.home_score;
  const ht = getTeam(game.home_team);
  const at = getTeam(game.away_team);

  return (
    <Link href={`/games/${game.id}`}>
      <div
        className="card reveal"
        style={{ padding: 18, animationDelay: `${index * 60}ms` }}
      >
        {/* Color strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${at.primary}, ${ht.primary})`,
          opacity: isLive ? 1 : 0.3,
        }} />

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {isLive ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="live-dot" />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: 0.6 }}>LIVE</span>
            </div>
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
              color: isFinal ? 'var(--t4)' : game.status === 'postponed' ? 'var(--red)' : 'var(--amber)',
            }}>
              {isFinal ? 'FINAL' : game.status === 'postponed' ? 'PPD' : 'UPCOMING'}
            </span>
          )}
          <LastUpdated timestamp={game.last_updated} isLive={isLive} />
        </div>

        {/* Teams */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TeamLine abbr={game.away_team} score={game.away_score} isWinner={awayWins} isLive={isLive} />
          <div style={{ height: 1, background: 'var(--b1)', marginLeft: 46 }} />
          <TeamLine abbr={game.home_team} score={game.home_score} isWinner={homeWins} isLive={isLive} />
        </div>

        {/* Score momentum bar */}
        {(isLive || isFinal) && (game.home_score + game.away_score) > 0 && (
          <div style={{ marginTop: 14, display: 'flex', gap: 3 }}>
            <div style={{
              height: 3, borderRadius: 2,
              background: at.primary,
              flex: game.away_score,
              transition: 'flex 1s var(--ease-out)',
              transformOrigin: 'left',
              animation: 'barGrow 0.8s var(--ease-out) both',
            }} />
            <div style={{
              height: 3, borderRadius: 2,
              background: ht.primary,
              flex: game.home_score,
              transition: 'flex 1s var(--ease-out)',
              transformOrigin: 'right',
              animation: 'barGrow 0.8s var(--ease-out) both',
            }} />
          </div>
        )}

        {/* Chevron */}
        <div style={{
          position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
          fontSize: 18, color: 'var(--t4)', pointerEvents: 'none',
        }}>›</div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div style={{ padding: 18, background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 16 }}>
      <div className="skeleton" style={{ height: 12, width: 48, marginBottom: 16 }} />
      {[0, 1].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i === 0 ? 10 : 0 }}>
          <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 10, width: 40, marginBottom: 5 }} />
            <div className="skeleton" style={{ height: 14, width: 90 }} />
          </div>
          <div className="skeleton" style={{ height: 28, width: 36, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

export default function GamesPage() {
  const { data, error, isLoading } = useSWR('/api/games', fetcher, { refreshInterval: 30000 });
  const [filter, setFilter] = useState<FK>('all');

  const games: Game[] = data?.games || [];
  const filtered = games.filter(g => {
    if (filter === 'live')      return g.status === 'in_progress';
    if (filter === 'final')     return g.status === 'final';
    if (filter === 'scheduled') return g.status === 'scheduled';
    return true;
  });
  const liveCount = games.filter(g => g.status === 'in_progress').length;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="reveal reveal-0" style={{ paddingTop: 12, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6 }}>CourtIQ</h1>
          {liveCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--green-10)', border: '1px solid var(--green-20)',
              borderRadius: 100, padding: '4px 10px',
            }}>
              <div className="live-dot" style={{ width: 6, height: 6 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{liveCount} Live</span>
            </div>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--t3)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Phase 12: Search */}
      <div className="reveal reveal-1">
        <SearchBar />
      </div>

      {/* Filter chips */}
      <div className="scroll-x reveal reveal-2" style={{ marginBottom: 18 }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.key === 'live' && liveCount > 0 && (
              <div className="live-dot" style={{ width: 5, height: 5, flexShrink: 0 }} />
            )}
            {f.label}
            {f.key === 'live' && liveCount > 0 && (
              <span style={{
                background: filter === 'live' ? 'rgba(0,0,0,0.2)' : 'var(--green)',
                color: '#000', borderRadius: 100, padding: '0 5px',
                fontSize: 10, fontWeight: 700,
              }}>{liveCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Phase 11: Freshness bar — only renders when live games exist and data is delayed */}
      <div className="reveal reveal-3"><FreshnessBar games={games as any} /></div>

      {/* Phase 10: Following section — only renders when favorites exist */}
      <FollowingSection />

      {/* Phase 9: Signal Feed — renders only when events exist */}
      <SignalFeed limit={6} refreshMs={15000} />

      {/* Content */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--red-10)', border: '1px solid var(--red-20)',
          borderRadius: 14, padding: '20px', textAlign: 'center',
        }}>
          <p style={{ color: 'var(--red)', fontSize: 14, fontWeight: 600 }}>Failed to load</p>
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 20px' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🏀</p>
          <p style={{ color: 'var(--t2)', fontSize: 16 }}>No {filter === 'all' ? '' : filter} games today</p>
        </div>
      )}

      {!isLoading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((g, i) => <GameCard key={g.id} game={g} index={i} />)}
        </div>
      )}
    </PageWrapper>
  );
}
