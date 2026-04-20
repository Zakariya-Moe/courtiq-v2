'use client';

import useSWR from 'swr';
import { useState } from 'react';
import Link from 'next/link';
import { getTeam } from '@/lib/utils/teams';
import AnimatedNumber from '../../components/AnimatedNumber';
import PerformanceChart from '../../components/PerformanceChart';
import PageWrapper from '../../components/PageWrapper';
import SignalBadge from '../../components/SignalBadge';
import { generatePlayerSignals } from '@/lib/analytics/signals';
import { isHighPriority, compareSignals, getSignalKey } from '@/lib/analytics/signal-diff';
import { recordSignalEvent } from '@/lib/analytics/signal-events';
import FollowButton from '../../components/FollowButton';
import ShareButton from '../../components/ShareButton';
import { buildPlayerSharePayload } from '@/lib/share/payloads';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface StatCellProps {
  label: string;
  value: number;
  suffix?: string;
  delay?: number;
  accent?: string;
  decimals?: number;
}

function StatCell({ label, value, suffix = '', delay = 0, accent, decimals }: StatCellProps) {
  const dec = decimals ?? (suffix === '%' ? 1 : 1);
  return (
    <div
      className="stat-cell"
      style={{ animation: `fadeUp 0.5s var(--ease-out) ${delay}ms both` }}
    >
      <div className="stat-value" style={{ color: accent || 'var(--t1)' }}>
        <AnimatedNumber value={value} decimals={dec} duration={800} suffix={suffix} />
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useSWR(`/api/players/${params.id}`, fetcher);
  const { data: seasonData } = useSWR(`/api/players/${params.id}/season`, fetcher);
  const [statView, setStatView] = useState<'season' | 'recent'>('season');

  if (isLoading) {
    return (
      <PageWrapper>
        <div style={{ paddingTop: 16 }}>
          <div className="skeleton" style={{ height: 14, width: 60, marginBottom: 20 }} />
          {/* Hero skeleton */}
          <div className="skeleton" style={{ height: 200, borderRadius: 22, marginBottom: 12 }} />
          {/* Chart skeleton */}
          <div className="skeleton" style={{ height: 260, borderRadius: 22, marginBottom: 12 }} />
          {/* Log skeleton */}
          <div className="skeleton" style={{ height: 300, borderRadius: 22 }} />
        </div>
      </PageWrapper>
    );
  }

  if (!data?.success) {
    return (
      <PageWrapper>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <p style={{ color: 'var(--t2)', marginBottom: 16 }}>Player not found</p>
          <Link href="/games" style={{ color: 'var(--green)', fontWeight: 600 }}>← Back</Link>
        </div>
      </PageWrapper>
    );
  }

  const { playerName, teamAbbr, averages, gameLog } = data;
  const team = getTeam(teamAbbr);

  // Trend for the pts sparkline
  const ptsLog = (gameLog || []).map((g: any) => g.points);
  const ptsDelta = ptsLog.length >= 2 ? ptsLog[0] - ptsLog[ptsLog.length - 1] : 0;
  const ptsTrend = ptsLog.length >= 2 && ptsLog[ptsLog.length - 1] > 0
    ? ((ptsLog[0] - ptsLog[ptsLog.length - 1]) / ptsLog[ptsLog.length - 1]) * 100
    : 0;
  const isUp = ptsDelta <= 0; // reversed: most recent first in gameLog

  // ── PHASE 7: Generate signals ──
  const recentGames = (gameLog || []).map((g: any) => ({
    points: g.points, rebounds: g.rebounds, assists: g.assists,
  }));
  const seasonAvg = averages.gp >= 5
    ? { pts: averages.pts, reb: averages.reb, ast: averages.ast }
    : undefined;
  const signals = generatePlayerSignals(recentGames, seasonAvg);
  const primarySignal = signals[0] ?? null;
  const primaryIsNew = primarySignal ? isHighPriority(primarySignal) : false;

  // Phase 9: record into signal feed when viewing a player with high-priority signal
  if (primarySignal && primaryIsNew) {
    recordSignalEvent(params.id, playerName, teamAbbr, primarySignal);
  }

  return (
    <PageWrapper>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* Back */}
      <Link href="/games" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        color: 'var(--t3)', fontSize: 13, fontWeight: 600,
        marginBottom: 18, paddingTop: 12,
      }}>
        ‹ Back
      </Link>

      {/* ── PHASE 6 STEP 1: Name + team (instant) ── */}
      <div className="reveal reveal-0" style={{
        background: 'var(--s1)', borderRadius: 22,
        border: '1px solid var(--b1)', padding: '22px 20px',
        marginBottom: 12, position: 'relative', overflow: 'hidden',
      }}>
        {/* Team color left bar */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: team.primary, borderRadius: '22px 0 0 22px',
        }} />

        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 0% 50%, ${team.primary}22, transparent 50%)`,
        }} />

        {/* Player identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <Link href={`/teams/${teamAbbr}`} style={{ flexShrink: 0 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: team.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.15s ease',
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.opacity = '0.8')}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.opacity = '1')}
            >
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{teamAbbr}</span>
            </div>
          </Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginBottom: 2 }}>{playerName}</h1>
            <p style={{ fontSize: 13, color: 'var(--t3)' }}>
              <Link
                href={`/teams/${teamAbbr}`}
                style={{ color: 'var(--t3)', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
              >
                {team.city} {team.name}
              </Link>
              {' '}· {averages.gp} games
            </p>
          </div>

          {/* Action buttons + trend badge + primary signal */}
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <ShareButton payload={buildPlayerSharePayload({
                playerId: params.id,
                playerName,
                teamAbbr,
                pts: statView === 'season' && seasonData?.season ? seasonData.season.pts : averages.pts,
                reb: statView === 'season' && seasonData?.season ? seasonData.season.reb : averages.reb,
                ast: statView === 'season' && seasonData?.season ? seasonData.season.ast : averages.ast,
                gp:  statView === 'season' && seasonData?.season ? seasonData.season.gp  : averages.gp,
                signal: primarySignal,
                isSeason: statView === 'season' && !!seasonData?.season,
              })} />
              <FollowButton playerId={params.id} playerName={playerName} />
            </div>
            {ptsLog.length >= 2 && (
              <span className={isUp ? 'badge-up' : 'badge-down'}>
                {isUp ? '▲' : '▼'} {Math.abs(ptsTrend).toFixed(1)}%
              </span>
            )}
            {primarySignal && (
              <SignalBadge signal={primarySignal} size="sm" isNew={primaryIsNew} />
            )}
          </div>
        </div>

        {/* ── PHASE 7: All active signals ── */}
        {signals.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {signals.map((sig, i) => (
              <div
                key={sig.type}
                className="reveal"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <SignalBadge signal={sig} size="md" showDescription isNew={isHighPriority(sig)} />
              </div>
            ))}
          </div>
        )}

        {/* ── PHASE 14: Season / Recent toggle ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--t4)', fontWeight: 600 }}>
            {statView === 'season'
              ? (seasonData?.season ? `${seasonData.season.season} Season · ${seasonData.season.gp}G` : 'Season averages')
              : `Last ${averages.gp} games in app`}
          </span>
          <div style={{ display: 'flex', gap: 3, background: 'var(--s3)', borderRadius: 10, padding: 3 }}>
            {(['season', 'recent'] as const).map(v => (
              <button
                key={v}
                onClick={() => setStatView(v)}
                style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                  background: statView === v ? 'var(--s4)' : 'transparent',
                  color: statView === v ? 'var(--t1)' : 'var(--t3)',
                  transition: 'all 0.15s ease', border: 'none', cursor: 'pointer',
                  letterSpacing: 0.2,
                }}
              >
                {v === 'season' ? 'Season' : 'Recent'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats — switch between season and recent */}
        {(() => {
          const s = seasonData?.season;
          const useSeason = statView === 'season' && s;
          const pts   = useSeason ? s.pts    : averages.pts;
          const reb   = useSeason ? s.reb    : averages.reb;
          const ast   = useSeason ? s.ast    : averages.ast;
          const stl   = useSeason ? s.stl    : averages.stl;
          const blk   = useSeason ? s.blk    : averages.blk;
          const fgPct = useSeason ? s.fgPct  : averages.fgPct;
          const fg3   = useSeason ? s.fg3Pct : averages.fg3Pct;
          const ftPct = useSeason ? s.ftPct  : averages.ftPct;
          return (
            <>
              {/* Core stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 18 }}>
                <StatCell label="PTS" value={pts} delay={80} accent={pts >= 25 ? 'var(--green)' : undefined} />
                <StatCell label="REB" value={reb} delay={120} />
                <StatCell label="AST" value={ast} delay={160} />
                <StatCell label="STL" value={stl} delay={200} />
                <StatCell label="BLK" value={blk} delay={240} />
              </div>
              <div style={{ height: 1, background: 'var(--b1)', marginBottom: 18 }} />
              {/* Shooting splits */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                <StatCell label="FG%"  value={fgPct} suffix="%" delay={100} />
                <StatCell label="3P%"  value={fg3}   suffix="%" delay={140} />
                <StatCell label="FT%"  value={ftPct} suffix="%" delay={180} />
                {!useSeason && <StatCell label="TS%"  value={averages.tsPct} suffix="%" delay={220} accent="var(--green)" />}
                {!useSeason && <StatCell label="eFG%" value={averages.effFg}  suffix="%" delay={260} />}
                {useSeason && <StatCell label="MIN" value={parseFloat(s.min) || 0} decimals={1} delay={220} />}
                {useSeason && <StatCell label="TO"  value={s.to}  delay={260} />}
              </div>
            </>
          );
        })()}
      </div>

      {/* ── PHASE 6 STEP 3: Chart draws in ── */}
      {gameLog && gameLog.length >= 2 && (
        <div className="reveal reveal-2" style={{
          background: 'var(--s1)', borderRadius: 22,
          border: '1px solid var(--b1)', padding: '22px 20px',
          marginBottom: 12,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, letterSpacing: -0.3 }}>Performance</h2>
          <PerformanceChart games={gameLog} teamAbbr={teamAbbr} />
        </div>
      )}

      {/* ── Game log ── */}
      {gameLog && gameLog.length > 0 && (
        <div className="reveal reveal-3" style={{
          background: 'var(--s1)', borderRadius: 22,
          border: '1px solid var(--b1)', padding: '20px 20px',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, letterSpacing: -0.3 }}>Game Log</h2>

          {/* Column headers */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--b1)', marginBottom: 2 }}>
            {['Opponent', 'PTS', 'REB', 'AST', 'FG%'].map((h, i) => (
              <div key={h} style={{ flex: i === 0 ? 2 : 1, textAlign: i === 0 ? 'left' : 'center' }}>
                <span className="section-label">{h}</span>
              </div>
            ))}
          </div>

          {gameLog.map((g: any, i: number) => {
            const opp = g.awayTeam === teamAbbr ? g.homeTeam : g.awayTeam;
            const fgPct = g.fgAttempted > 0 ? Math.round((g.fgMade / g.fgAttempted) * 100) : 0;
            return (
              <Link key={g.gameId} href={`/games/${g.gameId}`} style={{ display: 'block' }}>
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--b1)',
                  animation: `fadeUp 0.3s var(--ease-out) ${i * 30}ms both`,
                  transition: 'opacity 0.15s ease',
                }}>
                  <div style={{ flex: 2, minWidth: 0 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--t2)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                    }}>
                      vs {opp || '—'}
                    </span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: g.points >= 20 ? 'var(--green)' : g.points >= 30 ? '#FFC107' : 'var(--t1)',
                    }}>{g.points}</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t2)' }}>{g.rebounds}</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t2)' }}>{g.assists}</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, color: fgPct >= 50 ? 'var(--green)' : 'var(--t3)' }}>{fgPct}%</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
