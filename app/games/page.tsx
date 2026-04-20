'use client';

import useSWR from 'swr';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getTeam } from '@/lib/utils/teams';
import AnimatedNumber from '../components/AnimatedNumber';
import PageWrapper, { StaggerList, StaggerItem } from '../components/PageWrapper';
import SignalFeed from '../components/SignalFeed';
import FollowingSection from '../components/FollowingSection';
import FreshnessBar from '../components/FreshnessBar';
import SearchBar from '../components/SearchBar';
import LastUpdated from '../components/LastUpdated';
import LiveBadge from '../components/LiveBadge';
import FilterTabs from '../components/FilterTabs';
import { GameCardSkeleton } from '../components/SkeletonCard';
import { getVerdictContext } from '@/lib/analytics/game-verdict';

type Game = {
  id: string; home_team: string; away_team: string;
  home_score: number; away_score: number; status: string; last_updated: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

type FK = 'all' | 'live' | 'final' | 'scheduled';

// ── Team badge + score row ────────────────────────────────────
function TeamLine({
  abbr, score, isWinner, isLive,
}: { abbr: string; score: number; isWinner: boolean; isLive: boolean }) {
  const t = getTeam(abbr);
  const prevScore = useRef(score);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (isLive && score > prevScore.current) {
      prevScore.current = score;
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 800);
      return () => clearTimeout(timer);
    }
    if (!isLive) prevScore.current = score;
  }, [score, isLive]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Left — badge + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: t.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 2px 8px ${t.primary}44`,
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>{abbr}</span>
        </div>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2,
          }}>
            {t.city}
          </div>
          <div style={{
            fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em',
            color: isWinner ? 'var(--t1)' : 'var(--t3)',
          }}>
            {t.name}
          </div>
        </div>
      </div>

      {/* Right — score */}
      <motion.div
        animate={{ color: flash ? '#00C805' : isWinner ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
        transition={{ duration: flash ? 0 : 0.6, ease: 'easeOut' }}
        style={{
          fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--font-display)',
        }}
      >
        {isLive ? <AnimatedNumber value={score} duration={450} /> : score}
      </motion.div>
    </div>
  );
}


// ── Single game card ──────────────────────────────────────────
function GameCard({ game }: { game: Game }) {
  const isLive  = game.status === 'in_progress';
  const isFinal = game.status === 'final';
  const isUp    = game.status === 'scheduled';
  const isPPD   = game.status === 'postponed';

  const homeWins = isFinal && game.home_score > game.away_score;
  const awayWins = isFinal && game.away_score > game.home_score;
  const ht = getTeam(game.home_team);
  const at = getTeam(game.away_team);
  const total = game.home_score + game.away_score;

  const story = getVerdictContext(game.home_score, game.away_score, game.status);

  const statusLabel = isFinal ? 'FINAL'
    : isPPD ? 'PPD'
    : isUp   ? 'UPCOMING'
    : null;

  const statusColor = isFinal ? 'var(--t4)'
    : isPPD ? 'var(--red)'
    : 'var(--amber)';

  return (
    <Link href={`/games/${game.id}`} style={{ display: 'block' }}>
      <motion.div
        whileTap={{ scale: 0.975 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        style={{
          padding:      '16px 20px',
          background:   'var(--s1)',
          border:       '1px solid var(--b1)',
          borderRadius: 'var(--radius-lg)',
          position:     'relative',
          overflow:     'hidden',
          userSelect:   'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Team color strip — full opacity when live */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${at.primary}, ${ht.primary})`,
          opacity: isLive ? 1 : 0.25,
        }} />

        {/* Ambient team glow on live games */}
        {isLive && (
          <div style={{
            position:      'absolute',
            inset:         0,
            pointerEvents: 'none',
            background:    `radial-gradient(ellipse at 15% 50%, ${at.primary}10, transparent 55%),
                            radial-gradient(ellipse at 85% 50%, ${ht.primary}10, transparent 55%)`,
          }} />
        )}

        {/* Status row — left: status + story, right: timestamp + chevron */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   13,
        }}>
          {/* Left — status + story label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isLive ? (
              <LiveBadge size="sm" />
            ) : (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                color: statusColor,
              }}>
                {statusLabel}
              </span>
            )}

            {/* Story label — separator + text */}
            {story && (
              <>
                <span style={{
                  fontSize: 10,
                  color:    'rgba(255,255,255,0.15)',
                  lineHeight: 1,
                  flexShrink: 0,
                }}>·</span>
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x:  0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  style={{
                    fontSize:      11,
                    fontWeight:    600,
                    letterSpacing: '-0.01em',
                    color:         story.color,
                  }}
                >
                  {story.short}
                </motion.span>
              </>
            )}
          </div>

          {/* Right — timestamp + chevron anchored together */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <LastUpdated timestamp={game.last_updated} isLive={isLive} />
            <span style={{
              fontSize:  15,
              color:     'rgba(255,255,255,0.18)',
              lineHeight: 1,
            }}>›</span>
          </div>
        </div>

        {/* Teams */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <TeamLine abbr={game.away_team} score={game.away_score} isWinner={awayWins} isLive={isLive} />
          <div style={{ height: 1, background: 'var(--b1)', marginLeft: 47 }} />
          <TeamLine abbr={game.home_team} score={game.home_score} isWinner={homeWins} isLive={isLive} />
        </div>

        {/* Momentum bar */}
        {(isLive || isFinal) && total > 0 && (
          <div style={{ marginTop: 13, display: 'flex', gap: 2, borderRadius: 3, overflow: 'hidden' }}>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              style={{
                height:          3,
                background:      at.primary,
                flex:            game.away_score || 1,
                transformOrigin: 'left',
              }}
            />
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              style={{
                height:          3,
                background:      ht.primary,
                flex:            game.home_score || 1,
                transformOrigin: 'right',
              }}
            />
          </div>
        )}

      </motion.div>
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ filter }: { filter: FK }) {
  const messages: Record<FK, { emoji: string; line1: string; line2: string }> = {
    all:       { emoji: '🏀', line1: 'No games scheduled today',    line2: 'Check back tomorrow for the next slate' },
    live:      { emoji: '📡', line1: 'No live games right now',     line2: 'Games appear here as they tip off'       },
    final:     { emoji: '🏁', line1: 'No completed games yet',      line2: 'Final scores appear here after games end' },
    scheduled: { emoji: '🗓️', line1: 'No upcoming games',           line2: 'All games today may have already started' },
  };
  const m = messages[filter];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        textAlign:    'center',
        padding:      '56px 24px',
        background:   'var(--s1)',
        border:       '1px solid var(--b1)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 14, lineHeight: 1 }}>{m.emoji}</div>
      <div style={{
        fontSize:      16,
        fontWeight:    600,
        letterSpacing: '-0.02em',
        color:         'var(--t1)',
        marginBottom:  6,
      }}>
        {m.line1}
      </div>
      <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5 }}>
        {m.line2}
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function GamesPage() {
  const { data, error, isLoading } = useSWR('/api/games', fetcher, { refreshInterval: 30_000 });
  const [filter, setFilter] = useState<FK>('all');

  const games: Game[] = data?.games ?? [];

  const filtered = games.filter(g => {
    if (filter === 'live')      return g.status === 'in_progress';
    if (filter === 'final')     return g.status === 'final';
    if (filter === 'scheduled') return g.status === 'scheduled';
    return true;
  });

  const liveCount  = games.filter(g => g.status === 'in_progress').length;
  const finalCount = games.filter(g => g.status === 'final').length;

  // "Close" = live games within 8 points — worth surfacing in the filter tab
  const closeCount = games.filter(g =>
    g.status === 'in_progress' &&
    Math.abs(g.home_score - g.away_score) <= 8 &&
    (g.home_score + g.away_score) > 0
  ).length;

  // Live tab label: "Live  3 · 2 close" when close games exist
  const liveTabLabel = liveCount > 0 && closeCount > 0
    ? `Live · ${closeCount} close`
    : 'Live';

  const filterTabs = [
    { key: 'all',       label: 'All' },
    { key: 'live',      label: liveTabLabel, dot: liveCount > 0, badge: liveCount > 0 ? liveCount : undefined },
    { key: 'final',     label: 'Final',      badge: finalCount > 0 ? finalCount : undefined },
    { key: 'scheduled', label: 'Upcoming'   },
  ];

  return (
    <PageWrapper>
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y:  0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display:        'flex',
          alignItems:     'flex-end',
          justifyContent: 'space-between',
          paddingTop:     10,
          marginBottom:   20,
        }}
      >
        <div>
          <h1 style={{
            fontFamily:    'var(--font-display)',
            fontSize:      30,
            fontWeight:    700,
            letterSpacing: '-0.04em',
            lineHeight:    1,
            marginBottom:  4,
          }}>
            CourtIQ
          </h1>
          <p style={{
            fontSize:      12,
            fontWeight:    500,
            letterSpacing: '-0.01em',
            color:         'var(--t3)',
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <AnimatePresence>
          {liveCount > 0 && (
            <motion.div
              key="live-badge"
              initial={{ opacity: 0, scale: 0.8, x: 8 }}
              animate={{ opacity: 1, scale: 1,   x: 0 }}
              exit={{    opacity: 0, scale: 0.8,  x: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <LiveBadge count={liveCount} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Search ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: 14 }}
      >
        <SearchBar />
      </motion.div>

      {/* ── Filter tabs ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: 18 }}
      >
        <FilterTabs tabs={filterTabs} active={filter} onChange={(k) => setFilter(k as FK)} />
      </motion.div>

      {/* ── Freshness bar ───────────────────────────────────── */}
      <FreshnessBar games={games} />

      {/* ── Following + Signal Feed ─────────────────────────── */}
      <FollowingSection />
      <SignalFeed limit={6} refreshMs={15_000} />

      {/* ── Content ─────────────────────────────────────────── */}

      {/* Loading skeletons */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2, 3].map(i => <GameCardSkeleton key={i} index={i} />)}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background:   'var(--red-10)',
            border:       '1px solid var(--red-20)',
            borderRadius: 'var(--radius-md)',
            padding:      '20px',
            textAlign:    'center',
          }}
        >
          <p style={{ color: 'var(--red)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Failed to load games
          </p>
          <p style={{ color: 'var(--t3)', fontSize: 12 }}>Check your connection and try again</p>
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState filter={filter} />
      )}

      {/* Game list — staggered entrance */}
      {!isLoading && !error && filtered.length > 0 && (
        <StaggerList style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(g => (
            <StaggerItem key={g.id}>
              <GameCard game={g} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </PageWrapper>
  );
}
