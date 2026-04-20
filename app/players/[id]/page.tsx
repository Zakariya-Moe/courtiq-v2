'use client';

import React from 'react';
import useSWR from 'swr';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { getTeam } from '@/lib/utils/teams';
import AnimatedNumber from '../../components/AnimatedNumber';
import PageWrapper from '../../components/PageWrapper';
import SignalBadge from '../../components/SignalBadge';
import FollowButton from '../../components/FollowButton';
import ShareButton from '../../components/ShareButton';
import { ChartSkeleton, SkeletonBlock } from '../../components/SkeletonCard';
import { generatePlayerSignals } from '@/lib/analytics/signals';
import { isHighPriority } from '@/lib/analytics/signal-diff';
import { recordSignalEvent } from '@/lib/analytics/signal-events';
import { buildPlayerSharePayload } from '@/lib/share/payloads';
import FormVerdict, { getVerdictTheme, type SignalKind } from '../../components/FormVerdict';
import { getVerdictContext } from '@/lib/analytics/game-verdict';
import { computePlayerContext, getPatternSummary } from '@/lib/analytics/player-context';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ── Chart stat options ────────────────────────────────────────
const CHART_STATS = [
  { key: 'points',   label: 'PTS', color: '#00C805' },
  { key: 'rebounds', label: 'REB', color: '#a78bfa' },
  { key: 'assists',  label: 'AST', color: '#38bdf8' },
] as const;
type ChartStat = typeof CHART_STATS[number]['key'];

// ── Tooltip for the chart ─────────────────────────────────────
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="
      bg-s2 border border-white/10 rounded-xl px-3 py-2
      backdrop-blur-md shadow-lg min-w-[72px]
    ">
      <div style={{ fontSize: 22, fontWeight: 700, color: p.color, letterSpacing: '-0.04em', lineHeight: 1 }}>
        {Math.round(p.value)}
      </div>
      <div className="text-white/40 mt-0.5" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {p.payload?.label || ''}
      </div>
    </div>
  );
}

// ── Performance chart ─────────────────────────────────────────
function PerformanceSection({ gameLog, teamColor }: { gameLog: any[]; teamColor: string }) {
  const [stat, setStat] = useState<ChartStat>('points');
  const tab = CHART_STATS.find(t => t.key === stat)!;

  const chartData = [...gameLog].reverse().map((g, i) => ({
    i: i + 1,
    value: g[stat],
    label: g.label || `G${i + 1}`,
  }));

  const vals   = chartData.map(d => d.value);
  const avg    = vals.reduce((a, b) => a + b, 0) / vals.length;
  const latest = vals[vals.length - 1];
  const first  = vals[0];
  const deltaPct = first > 0 ? ((latest - first) / first) * 100 : 0;
  const isUp   = deltaPct >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="bg-s1 border border-white/[0.06] rounded-2xl p-5 mb-3"
    >
      {/* Section header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-white/40 mb-1" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            Performance
          </p>
          {/* Hero number */}
          <div className="flex items-baseline gap-2">
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: '-0.06em',
              color: tab.color,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              <AnimatedNumber value={latest} decimals={0} duration={700} mode="spring" />
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
              {tab.label}
            </span>
          </div>
          {/* Trend badge */}
          <div className="flex items-center gap-2 mt-2">
            <span className={isUp ? 'badge-up' : 'badge-down'} style={{ fontSize: 11 }}>
              {isUp ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}%
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              last {chartData.length}G · avg {avg.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Stat toggle */}
        <div className="flex gap-0.5 bg-s3 rounded-xl p-0.5">
          {CHART_STATS.map(t => (
            <motion.button
              key={t.key}
              onClick={() => setStat(t.key)}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.1 }}
              style={{
                padding:       '5px 11px',
                borderRadius:  9,
                fontSize:      12,
                fontWeight:    700,
                letterSpacing: '0.03em',
                border:        'none',
                cursor:        'pointer',
                background:    stat === t.key ? 'var(--s4)' : 'transparent',
                color:         stat === t.key ? t.color : 'rgba(255,255,255,0.3)',
                transition:    'background 0.15s ease, color 0.15s ease',
              }}
            >
              {t.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stat}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ResponsiveContainer width="100%" height={148}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${stat}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={tab.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={tab.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="i"
                tick={{ fill: 'rgba(255,255,255,0.18)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.18)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <ReferenceLine
                y={avg}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 6"
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={tab.color}
                strokeWidth={2}
                fill={`url(#grad-${stat})`}
                dot={{ fill: tab.color, r: 2.5, strokeWidth: 0 }}
                activeDot={{ fill: tab.color, r: 4.5, strokeWidth: 2, stroke: 'rgba(0,0,0,0.6)' }}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ── Single stat cell ──────────────────────────────────────────
// variant="primary"   → Syne 20px, full white — decision stats (PTS/REB/AST/STL/BLK)
// variant="secondary" → DM Sans 16px, 55% white — supporting data (FG%/3P%/FT%/TS%/MIN)
function StatCell({
  label, value, suffix = '', accent, delay = 0, variant = 'primary',
}: {
  label:    string;
  value:    number;
  suffix?:  string;
  accent?:  string;
  delay?:   number;
  variant?: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
      className="flex flex-col items-center gap-1"
    >
      <span style={{
        fontFamily:         isPrimary ? 'var(--font-display)' : 'var(--font)',
        fontSize:           isPrimary ? 20 : 16,
        fontWeight:         700,
        letterSpacing:      isPrimary ? '-0.035em' : '-0.02em',
        color:              accent ?? (isPrimary ? 'var(--t1)' : 'rgba(255,255,255,0.55)'),
        fontVariantNumeric: 'tabular-nums',
        lineHeight:         1,
      }}>
        <AnimatedNumber value={value} decimals={1} duration={700} suffix={suffix} />
      </span>
      <span style={{
        fontSize:      isPrimary ? 9 : 9,
        fontWeight:    700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase' as const,
        color:         isPrimary ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.20)',
      }}>
        {label}
      </span>
    </motion.div>
  );
}

// ── Game log row ──────────────────────────────────────────────
function GameLogRow({ g, teamAbbr, index }: { g: any; teamAbbr: string; index: number }) {
  const opp     = g.awayTeam === teamAbbr ? g.homeTeam : g.awayTeam;
  const fgPct   = g.fgAttempted > 0 ? Math.round((g.fgMade / g.fgAttempted) * 100) : 0;
  const isPts20 = g.points >= 20;
  const isPts30 = g.points >= 30;
  const ctx     = getVerdictContext(g.homeScore ?? 0, g.awayScore ?? 0, g.gameStatus ?? '');

  return (
    <Link href={`/games/${g.gameId}`} style={{ display: 'block' }}>
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
        whileTap={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
        className="flex items-center gap-2 py-2.5 border-b border-white/[0.05]"
        style={{ cursor: 'pointer' }}
      >
        {/* Opponent + game context */}
        <div className="flex-[2] min-w-0 flex items-center gap-1.5">
          <span style={{
            fontSize:     13,
            fontWeight:   500,
            color:        'rgba(255,255,255,0.55)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            letterSpacing: '-0.01em',
            flexShrink:   1,
            minWidth:     0,
          }}>
            vs {opp || '—'}
          </span>
          {ctx && (
            <span style={{
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color:         ctx.color,
              flexShrink:    0,
              lineHeight:    1,
            }}>
              {ctx.short}
            </span>
          )}
        </div>
        {/* PTS */}
        <div className="flex-1 text-center">
          <span style={{
            fontSize:  14,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: isPts30 ? '#FFC107' : isPts20 ? 'var(--green)' : 'var(--t1)',
          }}>
            {g.points}
          </span>
        </div>
        {/* REB */}
        <div className="flex-1 text-center">
          <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>
            {g.rebounds}
          </span>
        </div>
        {/* AST */}
        <div className="flex-1 text-center">
          <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>
            {g.assists}
          </span>
        </div>
        {/* FG% */}
        <div className="flex-1 text-center">
          <span style={{ fontSize: 12, fontWeight: 600, color: fgPct >= 50 ? 'var(--green)' : 'rgba(255,255,255,0.3)' }}>
            {fgPct}%
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

// ── Loading skeleton ──────────────────────────────────────────
function PlayerSkeleton() {
  return (
    <PageWrapper wide>
      <div className="pt-3">
        <SkeletonBlock width={48} height={11} style={{ marginBottom: 20 }} />
        {/* Hero card */}
        <div className="bg-s1 border border-white/[0.06] rounded-2xl p-5 mb-3">
          <div className="flex items-center gap-4 mb-6">
            <SkeletonBlock width={56} height={56} radius={16} />
            <div className="flex-1">
              <SkeletonBlock width={160} height={18} style={{ marginBottom: 8 }} />
              <SkeletonBlock width={110} height={12} />
            </div>
            <SkeletonBlock width={88} height={34} radius={100} />
          </div>
          <div className="grid grid-cols-5 gap-2 mb-5">
            {[...Array(5)].map((_, i) => <SkeletonBlock key={i} height={44} radius={10} />)}
          </div>
          <SkeletonBlock height={1} style={{ marginBottom: 16 }} />
          <div className="grid grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => <SkeletonBlock key={i} height={44} radius={10} />)}
          </div>
        </div>
        {/* Chart */}
        <ChartSkeleton height={220} />
      </div>
    </PageWrapper>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function PlayerPage({ params }: { params: { id: string } }) {
  const { data, isLoading  } = useSWR(`/api/players/${params.id}`, fetcher);
  const { data: seasonData } = useSWR(`/api/players/${params.id}/season`, fetcher);
  const [statView, setStatView] = useState<'season' | 'recent'>('season');

  if (isLoading) return <PlayerSkeleton />;

  if (!data?.success) {
    return (
      <PageWrapper wide>
        <div className="flex flex-col items-center justify-center" style={{ paddingTop: 80 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 16, fontSize: 15 }}>
            Player not found
          </p>
          <Link href="/games" style={{ color: 'var(--green)', fontWeight: 700, fontSize: 14 }}>
            ← Back to games
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const { playerName, teamAbbr, averages, gameLog } = data;
  const team = getTeam(teamAbbr);

  // Determine what stats to show based on view toggle
  const s          = seasonData?.season;
  const useSeason  = statView === 'season' && !!s;
  const pts   = useSeason ? s.pts    : averages.pts;
  const reb   = useSeason ? s.reb    : averages.reb;
  const ast   = useSeason ? s.ast    : averages.ast;
  const stl   = useSeason ? s.stl    : averages.stl;
  const blk   = useSeason ? s.blk    : averages.blk;
  const fgPct = useSeason ? s.fgPct  : averages.fgPct;
  const fg3   = useSeason ? s.fg3Pct : averages.fg3Pct;
  const ftPct = useSeason ? s.ftPct  : averages.ftPct;

  // ── Player context — centralized via player-context.ts ───────
  const playerCtx = computePlayerContext(gameLog ?? []);
  const pattern   = getPatternSummary(playerCtx);

  // ── Signals — context-weighted so blowout stats don't ────────
  // inflate signals. tension=1.0, notable=0.7, settled=0.5.
  // Falls back to plain game log when context data is sparse.
  const recentGames = playerCtx.contextWeightedGames.length >= 2
    ? playerCtx.contextWeightedGames
    : (gameLog ?? []).map((g: any) => ({
        points: g.points, rebounds: g.rebounds, assists: g.assists,
      }));

  const seasonAvg = averages.gp >= 5
    ? { pts: averages.pts, reb: averages.reb, ast: averages.ast }
    : undefined;
  const signals      = generatePlayerSignals(recentGames, seasonAvg);
  const primarySig   = signals[0] ?? null;
  const primaryIsNew = primarySig ? isHighPriority(primarySig) : false;

  if (primarySig && primaryIsNew) {
    recordSignalEvent(params.id, playerName, teamAbbr, primarySig);
  }

  // ── Form verdict computation ──────────────────────────────────
  const last5     = (gameLog ?? []).slice(0, 5);
  const last5Pts  = last5.map((g: any) => ({ pts: g.points }));
  const recentAvg = last5.length > 0
    ? last5.reduce((sum: number, g: any) => sum + g.points, 0) / last5.length
    : 0;
  const baseline  = seasonData?.season?.pts ?? averages.pts;
  const deltaPct  = baseline > 0 ? ((recentAvg - baseline) / baseline) * 100 : 0;
  const verdictTheme = getVerdictTheme(
    (primarySig?.type ?? null) as SignalKind,
    deltaPct,
  );
  const showVerdict = last5.length >= 2;

  // Chart delta — used by PerformanceSection
  const ptsLog = (gameLog ?? []).map((g: any) => g.points);

  return (
    <PageWrapper wide>
      {/* ── Back nav — full width above the grid ─────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="pt-3 mb-5"
      >
        <Link
          href="/games"
          style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           4,
            fontSize:      13,
            fontWeight:    600,
            color:         'rgba(255,255,255,0.35)',
            letterSpacing: '-0.01em',
          }}
        >
          ← Back
        </Link>
      </motion.div>

      {/* ── Two-column grid on desktop ────────────────────────────
          Only activates when both columns have content.
          Falls back to single column when game log is empty.
      ─────────────────────────────────────────────────────────── */}
      <div
        className={gameLog && gameLog.length > 0 ? 'md:grid md:gap-6' : ''}
        style={gameLog && gameLog.length > 0 ? { gridTemplateColumns: '44fr 56fr' } as React.CSSProperties : undefined}
      >

        {/* ══ LEFT COLUMN — decision layer ═══════════════════════
            Verdict + identity + stats
            On mobile: renders first, stacks naturally
        ════════════════════════════════════════════════════════ */}
        <div className="min-w-0">
          {/* ── HERO CARD — identity + stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="bg-s1 border border-white/[0.06] rounded-2xl p-5 mb-3 relative overflow-hidden"
      >
        {/* Team color top bar */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: 2, background: team.primary }}
        />

        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 5% 40%, ${team.primary}1a, transparent 55%)`,
          }}
        />

        {/* ── FORM VERDICT — the answer, first thing you see ── */}
        {showVerdict && (
          <FormVerdict
            theme={verdictTheme}
            deltaPct={deltaPct}
            baseline={baseline}
            recentAvg={recentAvg}
            games={last5Pts}
          />
        )}

        {/* ── Identity row ─────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6 relative">
          {/* Team badge */}
          <Link href={`/teams/${teamAbbr}`} style={{ flexShrink: 0 }}>
            <div
              style={{
                width:          56,
                height:         56,
                borderRadius:   16,
                background:     team.primary,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                boxShadow:      `0 4px 20px ${team.primary}50`,
                flexShrink:     0,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                {teamAbbr}
              </span>
            </div>
          </Link>

          {/* Name + team + primary signal inline */}
          <div className="flex-1 min-w-0">
            <h1 style={{
              fontFamily:    'var(--font-display)',
              fontSize:      22,
              fontWeight:    700,
              letterSpacing: '-0.03em',
              color:         '#fff',
              marginBottom:  3,
              overflow:      'hidden',
              textOverflow:  'ellipsis',
              whiteSpace:    'nowrap',
            }}>
              {playerName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.01em', flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Link href={`/teams/${teamAbbr}`} style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {team.city} {team.name}
                </Link>
                {' '}· {averages.gp}G
              </p>
              {primarySig && (
                <SignalBadge signal={primarySig} size="sm" isNew={primaryIsNew} />
              )}
            </div>
          </div>

          {/* Actions — follow + share */}
          <div className="flex items-center gap-2 flex-shrink-0">
              <ShareButton payload={buildPlayerSharePayload({
                playerId:   params.id,
                playerName,
                teamAbbr,
                pts:    useSeason && s ? s.pts  : averages.pts,
                reb:    useSeason && s ? s.reb  : averages.reb,
                ast:    useSeason && s ? s.ast  : averages.ast,
                gp:     useSeason && s ? s.gp   : averages.gp,
                signal: primarySig,
                isSeason: useSeason,
              })} />
              <FollowButton playerId={params.id} playerName={playerName} />
            </div>
        </div>

        {/* ── Season / Recent toggle ────────────────────────── */}
        <div className="flex items-center justify-end mb-4 relative">
          <div className="flex gap-0.5 bg-s3 rounded-xl p-0.5">
            {(['season', 'recent'] as const).map(v => {
              const isActive = statView === v;
              const sublabel = v === 'season'
                ? (s ? `${s.season}` : 'Season')
                : `Last ${averages.gp}G`;
              return (
                <motion.button
                  key={v}
                  onClick={() => setStatView(v)}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    display:       'flex',
                    flexDirection: 'column',
                    alignItems:    'center',
                    padding:       '5px 12px',
                    borderRadius:  9,
                    border:        'none',
                    cursor:        'pointer',
                    background:    isActive ? 'var(--s4)' : 'transparent',
                    transition:    'background 0.15s ease',
                  }}
                >
                  <span style={{
                    fontSize:      12,
                    fontWeight:    700,
                    letterSpacing: '0.01em',
                    color:         isActive ? 'var(--t1)' : 'rgba(255,255,255,0.3)',
                    transition:    'color 0.15s ease',
                    lineHeight:    1.2,
                  }}>
                    {v === 'season' ? 'Season' : 'Recent'}
                  </span>
                  <span style={{
                    fontSize:      9,
                    fontWeight:    500,
                    color:         isActive ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)',
                    marginTop:     2,
                    letterSpacing: '0.02em',
                    transition:    'color 0.15s ease',
                  }}>
                    {sublabel}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Core stat grid ───────────────────────────────── */}
        <div className="grid grid-cols-5 gap-2 mb-5 relative">
          <StatCell label="PTS" value={pts}  accent={pts >= 25 ? 'var(--green)' : undefined} delay={0.05} />
          <StatCell label="REB" value={reb}  delay={0.08} />
          <StatCell label="AST" value={ast}  delay={0.11} />
          <StatCell label="STL" value={stl}  delay={0.14} />
          <StatCell label="BLK" value={blk}  delay={0.17} />
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.05] mb-5" />

        {/* ── Shooting splits — secondary visual weight ────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={statView}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-5 gap-2 relative"
          >
            <StatCell label="FG%"  value={fgPct} suffix="%" variant="secondary" delay={0.06} />
            <StatCell label="3P%"  value={fg3}   suffix="%" variant="secondary" delay={0.09} />
            <StatCell label="FT%"  value={ftPct} suffix="%" variant="secondary" delay={0.12} />
            {useSeason && s ? (
              <>
                <StatCell label="MIN" value={parseFloat(s.min) || 0} variant="secondary" delay={0.15} />
                <StatCell label="TO"  value={s.to} variant="secondary" delay={0.18} />
              </>
            ) : (
              <>
                <StatCell label="TS%"  value={averages.tsPct} suffix="%" accent="rgba(0,200,5,0.7)" variant="secondary" delay={0.15} />
                <StatCell label="eFG%" value={averages.effFg}  suffix="%" variant="secondary" delay={0.18} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
        </div>{/* end left column */}

        {/* ══ RIGHT COLUMN — evidence layer ══════════════════════
            Game log with context tags
            On mobile: renders below hero card, stacks naturally
        ════════════════════════════════════════════════════════ */}
        <div className="min-w-0">
      {/* ══════════════════════════════════════════════════════
          GAME LOG
      ══════════════════════════════════════════════════════ */}
      {gameLog && gameLog.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.22 }}
          className="bg-s1 border border-white/[0.06] rounded-2xl px-5 pt-5 pb-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 style={{
              fontSize:      16,
              fontWeight:    700,
              letterSpacing: '-0.025em',
              color:         '#fff',
            }}>
              Game Log
            </h2>
            <span className="type-label">{gameLog.length} games</span>
          </div>

          {/* ── Pattern line ─────────────────────────────────────
              Only renders when ≥5 completed games with context.
              Answers: "does this player show up in close games?"
          ─────────────────────────────────────────────────────── */}
          {pattern && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y:  0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:          8,
                padding:     '8px 12px',
                marginBottom: 14,
                background:  'rgba(255,255,255,0.03)',
                border:      '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
              }}
            >
              {/* "24.8 tight · 19.2 settled" — numbers carry the meaning */}
              {pattern.tensionGames > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{
                    fontSize:           11,
                    fontWeight:         700,
                    color:              'var(--green)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing:      '-0.01em',
                  }}>
                    {pattern.tensionAvgPts}
                  </span>
                  <span style={{
                    fontSize:      9,
                    fontWeight:    700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color:         'rgba(255,255,255,0.25)',
                  }}>
                    tight
                  </span>
                </span>
              )}

              {pattern.tensionGames > 0 && pattern.settledGames > 0 && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)', flexShrink: 0 }}>·</span>
              )}

              {pattern.settledGames > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{
                    fontSize:           11,
                    fontWeight:         700,
                    color:              'rgba(255,255,255,0.38)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing:      '-0.01em',
                  }}>
                    {pattern.settledAvgPts}
                  </span>
                  <span style={{
                    fontSize:      9,
                    fontWeight:    700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color:         'rgba(255,255,255,0.20)',
                  }}>
                    settled
                  </span>
                </span>
              )}
            </motion.div>
          )}

          {/* Column labels */}
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05] mb-1">
            {['Opponent', 'PTS', 'REB', 'AST', 'FG%'].map((h, i) => (
              <div key={h} className={`${i === 0 ? 'flex-[2] text-left' : 'flex-1 text-center'}`}>
                <span className="type-label">{h}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {gameLog.map((g: any, i: number) => (
            <GameLogRow key={g.gameId} g={g} teamAbbr={teamAbbr} index={i} />
          ))}
        </motion.div>
      )}
        </div>{/* end right column */}
      </div>{/* end two-column grid */}

      {/* ══════════════════════════════════════════════════════
          PERFORMANCE CHART — full-width below both columns
      ══════════════════════════════════════════════════════ */}
      {gameLog && gameLog.length >= 2 && (
        <div className="mt-6">
          <PerformanceSection gameLog={gameLog} teamColor={team.primary} />
        </div>
      )}
    </PageWrapper>
  );
}
