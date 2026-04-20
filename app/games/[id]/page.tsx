'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTeam, calcTS, calcEFG, fmtMin } from '@/lib/utils/teams';
import AnimatedNumber from '../../components/AnimatedNumber';
import PageWrapper from '../../components/PageWrapper';
import ShareButton from '../../components/ShareButton';
import LiveBadge from '../../components/LiveBadge';
import { SkeletonBlock } from '../../components/SkeletonCard';
import { buildGameSharePayload } from '@/lib/share/payloads';
import { getGameVerdict, VERDICT_COLORS } from '@/lib/analytics/game-verdict';

type Player = {
  player_id: string; player_name: string; team_abbr: string; minutes: string;
  points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number;
  fg_made: number; fg_attempted: number; fg3_made: number; fg3_attempted: number;
  ft_made: number; ft_attempted: number;
};

type Game = {
  id: string; home_team: string; away_team: string;
  home_score: number; away_score: number; status: string; last_updated: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─────────────────────────────────────────────────────────────
// GAME INTELLIGENCE — all derived client-side from box score
// No new API calls. No fake data.
// ─────────────────────────────────────────────────────────────

// ── GameScore — basketball's standard efficiency metric ───────
// Rewards scoring efficiency, all-around contribution, punishes TO
function calcGameScore(p: Player): number {
  return (
    p.points
    + 0.4 * p.fg_made
    - 0.7 * p.fg_attempted
    + 0.7 * p.rebounds
    + 0.7 * p.assists
    + 1.0 * p.steals
    + 0.7 * p.blocks
    - 0.4 * p.turnovers
    - 0.4 * (p.fg_attempted - p.fg_made)
  );
}

// ── Team aggregate stats from player box scores ───────────────
type TeamAgg = {
  fgm: number; fga: number; fg3m: number; fg3a: number;
  reb: number; ast: number; to: number; pts: number;
  fgPct: number; fg3Pct: number;
};

function calcTeamAgg(players: Player[], abbr: string): TeamAgg {
  const team = players.filter(p => p.team_abbr === abbr);
  const sum = (fn: (p: Player) => number) => team.reduce((a, p) => a + fn(p), 0);
  const fgm = sum(p => p.fg_made);
  const fga = sum(p => p.fg_attempted);
  const fg3m = sum(p => p.fg3_made);
  const fg3a = sum(p => p.fg3_attempted);
  return {
    fgm, fga, fg3m, fg3a,
    reb: sum(p => p.rebounds),
    ast: sum(p => p.assists),
    to:  sum(p => p.turnovers),
    pts: sum(p => p.points),
    fgPct:  fga  > 0 ? Math.round((fgm  / fga)  * 100) : 0,
    fg3Pct: fg3a > 0 ? Math.round((fg3m / fg3a) * 100) : 0,
  };
}

// ─────────────────────────────────────────────────────────────
// GAME INTELLIGENCE — all derived client-side from box score
// getGameVerdict imported from lib/analytics/game-verdict.ts
// ─────────────────────────────────────────────────────────────

// ── Explanation: 1-line summary from real stats ───────────────
// Only states things that are provably true from the box score.
function buildExplanation(
  winnerAgg: TeamAgg, loserAgg: TeamAgg,
  winnerAbbr: string, loserAbbr: string,
  margin: number,
): string {
  const parts: string[] = [];

  const fgDiff = winnerAgg.fgPct - loserAgg.fgPct;
  const toDiff = loserAgg.to - winnerAgg.to; // positive = loser had more TOs

  if (fgDiff >= 10) {
    parts.push(`${winnerAbbr} shot ${winnerAgg.fgPct}% vs ${loserAbbr}'s ${loserAgg.fgPct}%`);
  }
  if (toDiff >= 6) {
    parts.push(`committed half the turnovers (${winnerAgg.to} vs ${loserAgg.to})`);
  } else if (toDiff >= 3) {
    parts.push(`protected the ball better (${winnerAgg.to} vs ${loserAgg.to} turnovers)`);
  }
  if (winnerAgg.fg3m >= 14) {
    parts.push(`hit ${winnerAgg.fg3m} threes`);
  }
  if (winnerAgg.ast >= 30) {
    parts.push(`shared the ball well (${winnerAgg.ast} assists)`);
  }

  // Fallback when no single stat tells the story clearly —
  // sounds like a human made a call, not a formula.
  if (parts.length === 0) {
    if (margin <= 5)  return 'Every possession mattered — neither team found separation.';
    if (margin <= 14) return `${winnerAbbr} controlled the pace and never let ${loserAbbr} get comfortable.`;
    if (margin <= 24) return `${winnerAbbr} built an early cushion and managed it well down the stretch.`;
    return `${winnerAbbr} set the tone early and it wasn't close from there.`;
  }

  return parts.join(' and ') + '.';
}



// ─────────────────────────────────────────────────────────────
// GAME INTELLIGENCE CARD
// ─────────────────────────────────────────────────────────────
function GameIntelCard({
  game, players,
}: { game: Game; players: Player[] }) {
  const isLive  = game.status === 'in_progress';
  const isFinal = game.status === 'final';
  if (!isLive && !isFinal) return null;
  if (players.length === 0) return null;

  const total    = game.home_score + game.away_score;
  const margin   = Math.abs(game.home_score - game.away_score);
  const verdict  = getGameVerdict(game.home_score, game.away_score, game.status);
  if (!verdict) return null;

  // Team aggregates
  const homeAgg = calcTeamAgg(players, game.home_team);
  const awayAgg = calcTeamAgg(players, game.away_team);

  // Winner/loser
  const homeLeads = game.home_score >= game.away_score;
  const winnerAgg  = homeLeads ? homeAgg : awayAgg;
  const loserAgg   = homeLeads ? awayAgg : homeAgg;
  const winnerAbbr = homeLeads ? game.home_team : game.away_team;
  const loserAbbr  = homeLeads ? game.away_team : game.home_team;

  // Explanation
  const explanation = (isFinal || margin > 8)
    ? buildExplanation(winnerAgg, loserAgg, winnerAbbr, loserAbbr, margin)
    : null;

  // Standout player by GameScore
  const playersWithGS = players
    .filter(p => p.fg_attempted > 0 || p.points > 0) // played real minutes
    .map(p => ({ ...p, gs: calcGameScore(p) }))
    .sort((a, b) => b.gs - a.gs);
  const standout = playersWithGS[0] ?? null;


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      style={{
        background:   verdict.bg,
        border:       `1px solid ${verdict.border}`,
        borderRadius: 'var(--radius-lg)',
        padding:      '20px',
        marginBottom: 10,
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Left accent bar */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: verdict.color, transformOrigin: 'top',
          borderRadius: '16px 0 0 16px',
        }}
      />

      {/* ── Verdict ─────────────────────────────────────────── */}
      <div style={{ marginBottom: explanation || standout ? 14 : 0 }}>
        <span style={{
          fontFamily:    'var(--font-display)',
          fontSize:      20,
          fontWeight:    700,
          letterSpacing: '-0.03em',
          color:         verdict.color,
          lineHeight:    1,
        }}>
          {verdict.emoji} {verdict.label}
        </span>

        {/* Explanation line */}
        {explanation && (
          <p style={{
            fontSize:      13,
            fontWeight:    500,
            letterSpacing: '-0.01em',
            color:         'rgba(255,255,255,0.5)',
            marginTop:     7,
            lineHeight:    1.45,
          }}>
            {explanation}
          </p>
        )}
      </div>

      {/* ── Standout player ─────────────────────────────────── */}
      {standout && (
        <>
          <div style={{
            height: 1,
            background: 'rgba(255,255,255,0.06)',
            marginBottom: 14,
          }} />
          <Link
            href={`/players/${standout.player_id}`}
            style={{ display: 'block' }}
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.22 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              {/* Team badge */}
              <div style={{
                width:          36,
                height:         36,
                borderRadius:   10,
                flexShrink:     0,
                background:     getTeam(standout.team_abbr).primary,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                boxShadow:      `0 2px 8px ${getTeam(standout.team_abbr).primary}44`,
              }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>
                  {standout.team_abbr}
                </span>
              </div>

              {/* Name + line score */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <div style={{
                  fontSize:      15,
                  fontWeight:    700,
                  letterSpacing: '-0.02em',
                  color:         '#fff',
                  overflow:      'hidden',
                  textOverflow:  'ellipsis',
                  whiteSpace:    'nowrap',
                }}>
                  ⭐ {standout.player_name}
                </div>
                {/* Line score */}
                <div style={{
                  fontSize:      12,
                  fontWeight:    500,
                  color:         'rgba(255,255,255,0.4)',
                  marginTop:     2,
                  letterSpacing: '-0.01em',
                }}>
                  {standout.points} pts
                  {standout.fg_attempted > 0 && ` · ${Math.round((standout.fg_made / standout.fg_attempted) * 100)}% FG`}
                  {standout.assists >= 5 && ` · ${standout.assists} ast`}
                  {standout.rebounds >= 8 && ` · ${standout.rebounds} reb`}
                  {standout.steals >= 3 && ` · ${standout.steals} stl`}
                  {standout.turnovers === 0 && ' · 0 TO'}
                </div>
              </div>
            </motion.div>
          </Link>
        </>
      )}

    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// BOX SCORE COMPONENTS
// ─────────────────────────────────────────────────────────────

const STAT_COLS = [
  { key: 'points'   as const, label: 'PTS', highlight: (v: number) => v >= 25 ? 'var(--green)' : v >= 20 ? 'rgba(0,200,5,0.7)' : null },
  { key: 'rebounds' as const, label: 'REB', highlight: (v: number) => v >= 10 ? '#a78bfa' : null },
  { key: 'assists'  as const, label: 'AST', highlight: (v: number) => v >= 8  ? '#38bdf8' : null },
  { key: 'steals'   as const, label: 'STL', highlight: () => null },
  { key: 'blocks'   as const, label: 'BLK', highlight: () => null },
];

function PlayerRow({ p, index }: { p: Player; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const ts     = calcTS(p.points, p.fg_attempted, p.ft_attempted);
  const efg    = calcEFG(p.fg_made, p.fg3_made, p.fg_attempted);
  const fgPct  = p.fg_attempted > 0 ? Math.round((p.fg_made  / p.fg_attempted)  * 100) : 0;
  const gs     = calcGameScore(p);
  const isTop  = gs >= 20; // highlight standout-level performances in the box score too

  return (
    <motion.div
      onClick={() => setExpanded(e => !e)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: index * 0.025 }}
      style={{
        borderBottom: '1px solid var(--b1)',
        padding:      '11px 0',
        cursor:       'pointer',
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/players/${p.player_id}`}
            onClick={e => e.stopPropagation()}
            style={{
              fontSize:     14,
              fontWeight:   isTop ? 700 : 600,
              color:        'var(--t1)',
              display:      'block',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
              letterSpacing: '-0.015em',
            }}
          >
            {p.player_name}
          </Link>
          <span style={{ fontSize: 11, color: 'var(--t4)' }}>{fmtMin(p.minutes)}</span>
        </div>

        {STAT_COLS.map(col => (
          <div key={col.key} style={{ textAlign: 'center', minWidth: 30 }}>
            <span style={{
              fontSize:   15,
              fontWeight: 600,
              color:      col.highlight(p[col.key]) || 'var(--t1)',
              letterSpacing: '-0.02em',
            }}>
              {p[col.key]}
            </span>
          </div>
        ))}

        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          style={{ fontSize: 14, color: 'var(--t4)', display: 'inline-block', width: 14, textAlign: 'center' }}
        >
          ›
        </motion.span>
      </div>

      {/* Expanded advanced stats */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{    opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap:                 8,
              marginTop:           12,
              paddingTop:          12,
              borderTop:           '1px solid var(--b1)',
            }}>
              {[
                { label: 'FG%',  value: `${fgPct}%` },
                { label: 'FG',   value: `${p.fg_made}/${p.fg_attempted}` },
                { label: '3PT',  value: `${p.fg3_made}/${p.fg3_attempted}` },
                { label: 'TS%',  value: `${ts}%` },
                { label: 'GmSc', value: gs.toFixed(1) },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--t4)', marginTop: 3 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TeamSection({ players, abbr }: { players: Player[]; abbr: string }) {
  const team        = getTeam(abbr);
  const teamPlayers = players.filter(p => p.team_abbr === abbr);
  if (!teamPlayers.length) return null;

  // Sort by GameScore descending — best performer always at top
  const sorted = [...teamPlayers].sort((a, b) => calcGameScore(b) - calcGameScore(a));

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 3, height: 14, background: team.primary, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)' }}>
          {team.city} {team.name}
        </span>
      </div>
      {/* Column headers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 6, borderBottom: '1px solid var(--b1)' }}>
        <div style={{ flex: 1 }}>
          <span className="type-label">Player</span>
        </div>
        {STAT_COLS.map(c => (
          <div key={c.key} style={{ minWidth: 30, textAlign: 'center' }}>
            <span className="type-label">{c.label}</span>
          </div>
        ))}
        <div style={{ width: 14 }} />
      </div>
      {sorted.map((p, i) => <PlayerRow key={p.player_id} p={p} index={i} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────
function GameSkeleton() {
  return (
    <PageWrapper wide>
      <div style={{ paddingTop: 12 }}>
        <SkeletonBlock width={48} height={11} style={{ marginBottom: 22 }} />
        {/* Score hero */}
        <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 22, padding: '24px 20px', marginBottom: 10 }}>
          <SkeletonBlock height={12} width={48} style={{ margin: '0 auto 20px' }} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
            <SkeletonBlock width={64} height={56} radius={8} />
            <SkeletonBlock width={20} height={56} radius={4} />
            <SkeletonBlock width={64} height={56} radius={8} />
          </div>
          <SkeletonBlock height={6} radius={3} style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <SkeletonBlock height={60} radius={10} style={{ flex: 1 }} />
            <SkeletonBlock height={60} radius={10} style={{ flex: 1 }} />
          </div>
        </div>
        {/* Intel card */}
        <SkeletonBlock height={140} radius={22} style={{ marginBottom: 10 }} />
        {/* Box score */}
        <SkeletonBlock height={300} radius={18} />
      </div>
    </PageWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────
export default function GamePage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useSWR(`/api/games/${params.id}`, fetcher, { refreshInterval: 30_000 });
  const [teamFilter, setTeamFilter] = useState<'all' | 'away' | 'home'>('all');

  if (isLoading) return <GameSkeleton />;

  if (!data?.success) {
    return (
      <PageWrapper wide>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Game not found</p>
          <Link href="/games" style={{ color: 'var(--green)', fontWeight: 700 }}>← Back</Link>
        </div>
      </PageWrapper>
    );
  }

  const game: Game    = data.game;
  const players: Player[] = data.players || [];
  const isLive   = game.status === 'in_progress';
  const isFinal  = game.status === 'final';
  const ht       = getTeam(game.home_team);
  const at       = getTeam(game.away_team);
  const homeWins = isFinal && game.home_score > game.away_score;
  const awayWins = isFinal && game.away_score > game.home_score;
  const total    = game.home_score + game.away_score;

  const filteredPlayers = teamFilter === 'away'
    ? players.filter(p => p.team_abbr === game.away_team)
    : teamFilter === 'home'
    ? players.filter(p => p.team_abbr === game.home_team)
    : players;

  return (
    <PageWrapper wide>
      <style>{`
        @keyframes barGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>

      {/* ── Back ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ paddingTop: 12, marginBottom: 16 }}
      >
        <Link href="/games" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
          letterSpacing: '-0.01em',
        }}>
          ← Games
        </Link>
      </motion.div>

      {/* ── Two-column grid on desktop ────────────────────────────
          Only activates when both columns have content.
          Falls back to single column when no box score data yet.
      ─────────────────────────────────────────────────────────── */}
      <div
        className={players.length > 0 ? 'md:grid md:gap-6' : ''}
        style={players.length > 0 ? { gridTemplateColumns: '44fr 56fr' } as React.CSSProperties : undefined}
      >

        {/* ══ LEFT COLUMN — decision layer ═══════════════════════
            Score hero + game intel card (verdict + standout)
        ════════════════════════════════════════════════════════ */}
        <div className="min-w-0">

      {/* ══════════════════════════════════════════════════════
          SCORE HERO
      ══════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y:  0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background:   'var(--s1)',
          borderRadius: 'var(--radius-lg)',
          border:       '1px solid var(--b1)',
          padding:      '22px 20px',
          marginBottom: 10,
          position:     'relative',
          overflow:     'hidden',
        }}
      >
        {/* Gradient top strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${at.primary}, ${ht.primary})`,
        }} />

        {/* Ambient glow */}
        <div style={{
          position:      'absolute',
          inset:         0,
          pointerEvents: 'none',
          background:    `radial-gradient(ellipse at 20% 50%, ${at.primary}15, transparent 55%),
                          radial-gradient(ellipse at 80% 50%, ${ht.primary}15, transparent 55%)`,
        }} />

        {/* Status + share */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   20,
          position:       'relative',
        }}>
          <div style={{ width: 36 }} />
          <div style={{ textAlign: 'center' }}>
            {isLive
              ? <LiveBadge />
              : <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                  color: isFinal ? 'var(--t4)' : 'var(--amber)',
                }}>
                  {isFinal ? 'FINAL' : 'UPCOMING'}
                </span>
            }
          </div>
          <ShareButton payload={buildGameSharePayload({
            gameId:    game.id,
            homeTeam:  game.home_team,
            awayTeam:  game.away_team,
            homeScore: game.home_score,
            awayScore: game.away_score,
            status:    game.status as any,
          })} />
        </div>

        {/* Score grid */}
        <div style={{
          display:       'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems:    'center',
          gap:           8,
          position:      'relative',
        }}>
          {/* Away */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 3 }}>
              {game.away_team}
            </div>
            <Link
              href={`/teams/${game.away_team}`}
              style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: awayWins ? 'var(--t1)' : 'var(--t2)', display: 'block' }}
            >
              {at.name}
            </Link>
          </div>

          {/* Scores */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px' }}>
            <span className="hero-score" style={{ color: awayWins ? '#fff' : isFinal ? 'var(--t2)' : '#fff' }}>
              {isLive ? <AnimatedNumber value={game.away_score} duration={400} /> : game.away_score}
            </span>
            <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.15)', fontWeight: 300, lineHeight: 1 }}>–</span>
            <span className="hero-score" style={{ color: homeWins ? '#fff' : isFinal ? 'var(--t2)' : '#fff' }}>
              {isLive ? <AnimatedNumber value={game.home_score} duration={400} /> : game.home_score}
            </span>
          </div>

          {/* Home */}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 3 }}>
              {game.home_team}
            </div>
            <Link
              href={`/teams/${game.home_team}`}
              style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: homeWins ? 'var(--t1)' : 'var(--t2)', display: 'block' }}
            >
              {ht.name}
            </Link>
          </div>
        </div>

        {/* Momentum bar */}
        {total > 0 && (
          <div style={{ marginTop: 20, position: 'relative' }}>
            <div style={{ display: 'flex', gap: 2, borderRadius: 4, overflow: 'hidden' }}>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                style={{ height: 5, background: at.primary, flex: game.away_score || 1, transformOrigin: 'left' }}
              />
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
                style={{ height: 5, background: ht.primary, flex: game.home_score || 1, transformOrigin: 'right' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                {game.away_team} {total > 0 ? ((game.away_score / total) * 100).toFixed(0) : 0}%
              </span>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                {game.home_team} {total > 0 ? ((game.home_score / total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          GAME INTEL — verdict + standout
      ══════════════════════════════════════════════════════ */}
      <GameIntelCard game={game} players={players} />

        </div>{/* end left column */}

        {/* ══ RIGHT COLUMN — evidence layer ══════════════════════
            Box score — sorted by GameScore
        ════════════════════════════════════════════════════════ */}
        <div className="min-w-0">

      {/* ══════════════════════════════════════════════════════
          BOX SCORE
      ══════════════════════════════════════════════════════ */}
      {players.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
        >
          {/* Header + team filter */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   10,
            marginTop:      2,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.025em', color: '#fff' }}>
              Box Score
            </h2>
            <div style={{ display: 'flex', gap: 3, background: 'var(--s2)', borderRadius: 10, padding: 3 }}>
              {(['all', 'away', 'home'] as const).map(k => (
                <motion.button
                  key={k}
                  onClick={() => setTeamFilter(k)}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    padding:    '4px 10px',
                    borderRadius: 7,
                    fontSize:   11,
                    fontWeight: 700,
                    background: teamFilter === k ? 'var(--s3)' : 'transparent',
                    color:      teamFilter === k ? 'var(--t1)' : 'var(--t3)',
                    transition: 'background 0.15s ease, color 0.15s ease',
                    border:     'none',
                    cursor:     'pointer',
                    letterSpacing: '0.01em',
                  }}
                >
                  {k === 'away' ? game.away_team : k === 'home' ? game.home_team : 'All'}
                </motion.button>
              ))}
            </div>
          </div>

          <div style={{
            background:   'var(--s1)',
            borderRadius: 18,
            border:       '1px solid var(--b1)',
            padding:      '0 16px',
          }}>
            {teamFilter === 'all' ? (
              <>
                <TeamSection players={players} abbr={game.away_team} />
                <TeamSection players={players} abbr={game.home_team} />
              </>
            ) : (
              <TeamSection players={filteredPlayers} abbr={teamFilter === 'away' ? game.away_team : game.home_team} />
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          style={{
            background:   'var(--s1)',
            borderRadius: 18,
            border:       '1px solid var(--b1)',
            padding:      '36px 20px',
            textAlign:    'center',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            {isLive || isFinal ? 'Stats loading...' : 'Stats available at tip-off'}
          </p>
        </motion.div>
      )}
        </div>{/* end right column */}
      </div>{/* end two-column grid */}
    </PageWrapper>
  );
}
