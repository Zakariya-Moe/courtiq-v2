'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTeam } from '@/lib/utils/teams';
import Sparkline from '../components/Sparkline';
import AnimatedNumber from '../components/AnimatedNumber';
import PageWrapper, { StaggerList, StaggerItem } from '../components/PageWrapper';
import SignalBadge from '../components/SignalBadge';
import FilterTabs from '../components/FilterTabs';
import { PlayerRowSkeleton } from '../components/SkeletonCard';
import { generatePlayerSignals, getPrimarySignal } from '@/lib/analytics/signals';
import { isHighPriority } from '@/lib/analytics/signal-diff';
import { recordSignalEvent } from '@/lib/analytics/signal-events';
import { isFavorite } from '@/lib/user/favorites';
import { getVerdictContext } from '@/lib/analytics/game-verdict';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ── Sparkline entry now carries game context ──────────────────
type SparkEntry = {
  pts:        number;
  gameStatus: string | null;
  homeScore:  number;
  awayScore:  number;
};

type Player = {
  playerId: string; playerName: string; teamAbbr: string;
  avgPts: number;    avgReb: number;    avgAst: number;    // raw averages
  ctxAvgPts: number; ctxAvgReb: number; ctxAvgAst: number; // context-weighted
  showRawPts: boolean; // true when ctx and raw differ meaningfully
  gp: number; trend: number;
  sparkline: SparkEntry[];
};

// ── Context split — shared by LeaderCard and PlayerRow ────────
// Returns null when sample is too small or context is ambiguous.
type ContextSplit = {
  tensionCount:  number;
  totalCount:    number;
  tensionLabel:  string;   // e.g. "3/5 tight"
  color:         string;
  showSuffix:    boolean;  // true when split is meaningfully skewed
  suffixLabel:   string;   // e.g. "mostly close" or "mostly comfortable"
};

function calcContextSplit(sparkline: SparkEntry[]): ContextSplit | null {
  // Need ≥3 final games with score data
  const valid = sparkline.filter(
    g => g.gameStatus === 'final' && (g.homeScore + g.awayScore) > 0
  );
  if (valid.length < 3) return null;

  let tensionCount = 0;
  let settledCount = 0;

  for (const g of valid) {
    const ctx = getVerdictContext(g.homeScore, g.awayScore, g.gameStatus ?? '');
    if (!ctx) continue;
    if (ctx.short === 'Wire' || ctx.short === 'Tight') tensionCount++;
    else if (ctx.short === 'Solid' || ctx.short === 'Comfort' || ctx.short === 'Blowout') settledCount++;
    // Notable (High) excluded — unusual context
  }

  const totalCount = tensionCount + settledCount;
  if (totalCount < 3) return null;        // not enough non-notable games
  if (tensionCount === 0 || settledCount === 0) return null; // need split to be meaningful

  const tensionPct = Math.round((tensionCount / totalCount) * 100);

  // Suppress interpretation suffix when split is close to 50/50 (40–60%)
  const showSuffix  = tensionPct < 40 || tensionPct > 60;
  const suffixLabel = tensionPct > 60 ? 'mostly close' : 'mostly comfortable';

  return {
    tensionCount,
    totalCount,
    tensionLabel: `${tensionCount}/${totalCount} tight`,
    color:        'var(--green)',
    showSuffix,
    suffixLabel,
  };
}

const SORTS = [
  { key: 'pts',   label: 'Points'   },
  { key: 'reb',   label: 'Rebounds' },
  { key: 'ast',   label: 'Assists'  },
  { key: 'trend', label: '🔥 Hot'   },
] as const;
type SortKey = typeof SORTS[number]['key'];

// ── Hero leader card ─────────────────────────────────────────
function LeaderCard({ player, sortKey }: { player: Player; sortKey: SortKey }) {
  const team = getTeam(player.teamAbbr);

  // Primary stat — context-weighted for all three categories
  const stat  = sortKey === 'reb' ? player.ctxAvgReb
               : sortKey === 'ast' ? player.ctxAvgAst
               : player.ctxAvgPts;
  const label = sortKey === 'reb' ? 'RPG' : sortKey === 'ast' ? 'APG' : 'PPG';
  const isUp  = player.trend >= 0;

  // Raw pts for secondary display — only when meaningfully different
  const showRaw = sortKey === 'pts' && player.showRawPts;

  // Extract pts-only for signal engine and Sparkline
  const ptsOnly     = player.sparkline.map(g => g.pts);
  const recentGames = ptsOnly.map(pts => ({ points: pts, rebounds: 0, assists: 0 }));
  const signal      = getPrimarySignal(generatePlayerSignals(recentGames));
  const split       = calcContextSplit(player.sparkline);

  return (
    <Link href={`/players/${player.playerId}`} style={{ display: 'block' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y:  0 }}
        whileTap={{ scale: 0.975 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          padding:      '20px',
          marginBottom: 16,
          background:   'var(--s1)',
          border:       '1px solid var(--b1)',
          borderRadius: 'var(--radius-lg)',
          position:     'relative',
          overflow:     'hidden',
          userSelect:   'none',
        }}
      >
        {/* Team color strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: team.primary, opacity: 0.8,
        }} />

        {/* Ambient glow */}
        <div style={{
          position:      'absolute',
          inset:         0,
          pointerEvents: 'none',
          background:    `radial-gradient(ellipse at 10% 60%, ${team.primary}22, transparent 55%)`,
        }} />

        {/* Header row */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   16,
        }}>
          <span style={{
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color:         'var(--t4)',
          }}>
            🔥 Top Performer
          </span>
          {signal && <SignalBadge signal={signal} size="sm" isNew={isHighPriority(signal)} />}
        </div>

        {/* Player info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Team badge */}
          <div style={{
            width:        56,
            height:       56,
            borderRadius: 16,
            flexShrink:   0,
            background:   team.primary,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            boxShadow:    `0 4px 16px ${team.primary}44`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
              {player.teamAbbr}
            </span>
          </div>

          {/* Name */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize:       19,
              fontWeight:     700,
              letterSpacing:  '-0.025em',
              color:          'var(--t1)',
              overflow:       'hidden',
              textOverflow:   'ellipsis',
              whiteSpace:     'nowrap',
              marginBottom:   3,
            }}>
              {player.playerName}
            </div>
            <div style={{ fontSize: 13, color: 'var(--t3)', letterSpacing: '-0.01em' }}>
              {team.city} {team.name} · {player.gp}G
            </div>
          </div>

          {/* Stat — context-weighted as primary */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontFamily:    'var(--font-display)',
              fontSize:      40,
              fontWeight:    700,
              letterSpacing: '-0.05em',
              color:         'var(--green)',
              lineHeight:    1,
            }}>
              <AnimatedNumber value={stat} decimals={1} duration={900} mode="spring" />
            </div>
            <div style={{
              fontSize:      10,
              fontWeight:    700,
              letterSpacing: '0.06em',
              color:         'var(--t4)',
              marginTop:     4,
              textTransform: 'uppercase',
            }}>
              {label}
            </div>
            {/* Raw average — only when context weighting moved it meaningfully */}
            {showRaw && (
              <div style={{
                fontSize:      10,
                fontWeight:    500,
                color:         'rgba(255,255,255,0.22)',
                marginTop:     3,
                letterSpacing: '-0.01em',
              }}>
                raw {player.avgPts}
              </div>
            )}
          </div>
        </div>

        {/* Sparkline strip */}
        {ptsOnly.length >= 3 && (
          <div style={{ marginTop: 16 }}>
            <Sparkline
              data={ptsOnly}
              width={undefined as any}
              height={40}
              color={isUp ? '#00C805' : '#FF3B30'}
            />
          </div>
        )}

        {/* Bottom row — trend badge + context split */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className={isUp ? 'badge-up' : 'badge-down'}>
            {isUp ? '↑' : '↓'} {Math.abs(player.trend).toFixed(1)}% {isUp ? 'trending up' : 'trending down'}
          </span>

          {/* Context split — compact pattern line for scanning surface */}
          {split && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                fontSize:      11,
                fontWeight:    700,
                letterSpacing: '-0.01em',
                color:         split.color,
              }}>
                {split.tensionLabel}
              </span>
              {split.showSuffix && (
                <span style={{
                  fontSize:      10,
                  fontWeight:    600,
                  color:         'rgba(255,255,255,0.3)',
                  letterSpacing: '-0.01em',
                }}>
                  · {split.suffixLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ── Player row ────────────────────────────────────────────────
function PlayerRow({ p, rank, sortKey }: {
  p: Player; rank: number; sortKey: SortKey;
}) {
  const team  = getTeam(p.teamAbbr);
  const isUp  = p.trend >= 0;

  // Context-weighted stat as primary
  const stat    = sortKey === 'reb' ? p.ctxAvgReb
                : sortKey === 'ast' ? p.ctxAvgAst
                : p.ctxAvgPts;
  const showRaw = sortKey === 'pts' && p.showRawPts;

  const ptsOnly     = p.sparkline.map(g => g.pts);
  const recentGames = ptsOnly.map(pts => ({ points: pts, rebounds: 0, assists: 0 }));
  const signal      = getPrimarySignal(generatePlayerSignals(recentGames));
  const split       = calcContextSplit(p.sparkline);

  if (signal && isHighPriority(signal)) {
    recordSignalEvent(p.playerId, p.playerName, p.teamAbbr, signal);
  }

  const isFav     = isFavorite(p.playerId);
  const hasSignal = signal && isHighPriority(signal);

  return (
    <Link href={`/players/${p.playerId}`} style={{ display: 'block' }}>
      <motion.div
        whileTap={{ scale: 0.975 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          12,
          padding:      '13px 14px',
          background:   'var(--s1)',
          borderRadius: 'var(--radius-md)',
          border:       hasSignal
            ? `1px solid ${signal.type === 'breakout' ? 'rgba(0,200,5,0.22)' : 'rgba(255,100,0,0.20)'}`
            : '1px solid var(--b1)',
          userSelect:   'none',
          WebkitUserSelect: 'none',
          position:     'relative',
          overflow:     'hidden',
        }}
      >
        {/* Rank */}
        <span style={{
          fontSize:  12,
          fontWeight: 700,
          color:     rank <= 3 ? 'var(--t2)' : 'var(--t4)',
          minWidth:  18,
          textAlign: 'center',
          flexShrink: 0,
        }}>
          {rank}
        </span>

        {/* Team badge */}
        <div style={{
          width:          40,
          height:         40,
          borderRadius:   11,
          flexShrink:     0,
          background:     team.primary,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          boxShadow:      `0 2px 8px ${team.primary}40`,
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{p.teamAbbr}</span>
        </div>

        {/* Name + signal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            {isFav && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--green)" style={{ flexShrink: 0 }}>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            )}
            <span style={{
              fontSize:     14,
              fontWeight:   600,
              letterSpacing: '-0.015em',
              color:        'var(--t1)',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {p.playerName}
            </span>
            {/* High-priority signal takes precedence over context fraction.
                Context fraction shows when no high-priority signal present.
                Never both — they answer the same question from different angles. */}
            {hasSignal
              ? <SignalBadge signal={signal!} size="sm" isNew={isHighPriority(signal!)} />
              : null
            }
          </div>
          {/* Metadata: team · games · context fraction (only when no signal badge) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--t4)', letterSpacing: '-0.01em' }}>
            <span>{team.name} · {p.gp}G</span>
            {!hasSignal && split && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
                <span style={{ fontWeight: 700, color: split.color }}>
                  {split.tensionLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {ptsOnly.length >= 2 && (
          <Sparkline
            data={ptsOnly}
            width={52}
            height={28}
            color={isUp ? '#00C805' : '#FF3B30'}
          />
        )}

        {/* Stat + trend — context-weighted primary, raw secondary when meaningful */}
        <div style={{ textAlign: 'right', minWidth: 52, flexShrink: 0 }}>
          <div style={{
            fontFamily:    'var(--font-display)',
            fontSize:      20,
            fontWeight:    700,
            letterSpacing: '-0.03em',
            color:         'var(--t1)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight:    1,
          }}>
            <AnimatedNumber value={stat} decimals={1} duration={600} />
          </div>
          <div style={{
            fontSize:   11,
            fontWeight: 700,
            marginTop:  3,
            color:      isUp ? 'var(--green)' : 'var(--red)',
          }}>
            {isUp ? '+' : ''}{p.trend.toFixed(1)}%
          </div>
          {showRaw && (
            <div style={{
              fontSize:      9,
              fontWeight:    500,
              color:         'rgba(255,255,255,0.2)',
              marginTop:     2,
              letterSpacing: '-0.01em',
            }}>
              raw {p.avgPts}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState() {
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
      <div style={{ fontSize: 40, marginBottom: 14, lineHeight: 1 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--t1)', marginBottom: 6 }}>
        No player data yet
      </div>
      <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5 }}>
        Stats appear here after games are ingested.<br />
        Hit <code style={{ color: 'var(--t2)', fontSize: 12 }}>/api/test-nba</code> to seed data.
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function HotPage() {
  const { data, isLoading, error } = useSWR('/api/hot-players', fetcher, { refreshInterval: 60_000 });
  const [sort, setSort] = useState<SortKey>('pts');

  const players: Player[] = data?.players ?? [];

  function signalBoost(p: Player): number {
    const games = p.sparkline.map((g: SparkEntry) => ({ points: g.pts, rebounds: 0, assists: 0 }));
    const sig = getPrimarySignal(generatePlayerSignals(games));
    if (!sig) return 0;
    return { breakout: 4, hot: 3, consistent: 1, cold: -1, declining: -2 }[sig.type] ?? 0;
  }

  const sorted = [...players].sort((a, b) => {
    if (sort === 'trend') return b.trend - a.trend;
    const favA = isFavorite(a.playerId) ? 10 : 0;
    const favB = isFavorite(b.playerId) ? 10 : 0;
    const boost = (favB + signalBoost(b)) - (favA + signalBoost(a));
    if (boost !== 0) return boost;
    // Sort by context-weighted averages — ranking reflects meaning, not raw output
    if (sort === 'reb') return b.ctxAvgReb - a.ctxAvgReb;
    if (sort === 'ast') return b.ctxAvgAst - a.ctxAvgAst;
    return b.ctxAvgPts - a.ctxAvgPts;
  });

  const leader = sorted[0];
  const rest   = sorted.slice(1);

  const sortTabs = SORTS.map(s => ({ key: s.key, label: s.label }));

  return (
    <PageWrapper>
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y:  0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ paddingTop: 10, marginBottom: 20 }}
      >
        <h1 style={{
          fontFamily:    'var(--font-display)',
          fontSize:      30,
          fontWeight:    700,
          letterSpacing: '-0.04em',
          lineHeight:    1,
          marginBottom:  4,
        }}>
          Trending
        </h1>
        <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--t3)' }}>
          Top performers · Last 7 days
        </p>
      </motion.div>

      {/* ── Leader hero ─────────────────────────────────────── */}
      <AnimatePresence>
        {!isLoading && leader && (
          <LeaderCard key={leader.playerId} player={leader} sortKey={sort} />
        )}
      </AnimatePresence>

      {/* ── Sort tabs ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: 14 }}
      >
        <FilterTabs tabs={sortTabs} active={sort} onChange={(k) => setSort(k as SortKey)} />
      </motion.div>

      {/* ── Column headers ──────────────────────────────────── */}
      {!isLoading && rest.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         12,
            padding:     '0 14px',
            marginBottom: 8,
          }}
        >
          <div style={{ width: 18 }} />
          <div style={{ width: 40, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span className="type-label">Player</span>
          </div>
          <div style={{ width: 52 }} />
          <div style={{ minWidth: 52, textAlign: 'right' }}>
            <span className="type-label">
              {sort === 'reb' ? 'REB' : sort === 'ast' ? 'AST' : 'PTS'} / Δ
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Loading skeletons ────────────────────────────────── */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <PlayerRowSkeleton key={i} index={i} />
          ))}
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────── */}
      {!isLoading && error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--t3)' }}
        >
          <p>Failed to load players</p>
        </motion.div>
      )}

      {/* ── Empty ───────────────────────────────────────────── */}
      {!isLoading && !error && sorted.length === 0 && <EmptyState />}

      {/* ── Player list ─────────────────────────────────────── */}
      {!isLoading && !error && rest.length > 0 && (
        <StaggerList style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rest.map((p, i) => (
            <StaggerItem key={p.playerId}>
              <PlayerRow p={p} rank={i + 2} sortKey={sort} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </PageWrapper>
  );
}
