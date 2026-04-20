'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { getTeam } from '@/lib/utils/teams';
import AnimatedNumber from '../../components/AnimatedNumber';
import PageWrapper from '../../components/PageWrapper';
import SignalBadge from '../../components/SignalBadge';
import { generatePlayerSignals, getPrimarySignal } from '@/lib/analytics/signals';
import type { RosterPlayer, TeamStats } from '@/app/api/teams/[abbr]/route';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ── Stat cell ────────────────────────────────────────────────
function StatCell({
  label, value, suffix = '', delay = 0,
}: { label: string; value: number; suffix?: string; delay?: number }) {
  return (
    <div className="stat-cell" style={{ animation: `fadeUp 0.5s var(--ease-out) ${delay}ms both` }}>
      <div className="stat-value">
        <AnimatedNumber value={value} decimals={suffix === '%' ? 1 : 1} duration={700} suffix={suffix} />
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Top performer card ───────────────────────────────────────
function TopCard({ player, rank }: { player: RosterPlayer; rank: number }) {
  // Derive signals from avgPts as a single-point "recent" game
  // — enough for a signal directional read on top performers
  const fakeGames = Array(Math.min(player.gp, 5)).fill({ points: player.avgPts, rebounds: player.avgReb, assists: player.avgAst });
  const signal = getPrimarySignal(generatePlayerSignals(fakeGames));

  return (
    <Link href={`/players/${player.playerId}`} style={{ display: 'block', flex: '1 1 0', minWidth: 0 }}>
      <div
        className="card"
        style={{ padding: '14px 12px', height: '100%' }}
      >
        {/* Rank */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 8 }}>#{rank}</div>

        {/* Name */}
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--t1)',
          marginBottom: 4, lineHeight: 1.25,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {player.playerName}
        </div>

        {/* Signal */}
        {signal && (
          <div style={{ marginBottom: 10 }}>
            <SignalBadge signal={signal} size="sm" />
          </div>
        )}

        {/* PPG hero number */}
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1, color: 'var(--t1)', marginBottom: 2 }}>
          <AnimatedNumber value={player.avgPts} decimals={1} duration={600} />
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--t4)' }}>PPG</div>

        {/* Secondary stats */}
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          {[
            { v: player.avgReb, l: 'REB' },
            { v: player.avgAst, l: 'AST' },
          ].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>{s.v.toFixed(1)}</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--t4)' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* GP context */}
        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 8 }}>{player.gp}G</div>
      </div>
    </Link>
  );
}

// ── Roster row ───────────────────────────────────────────────
function RosterRow({ player, index }: { player: RosterPlayer; index: number }) {
  return (
    <Link href={`/players/${player.playerId}`} style={{ display: 'block' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 0',
        borderBottom: '1px solid var(--b1)',
        cursor: 'pointer',
        animation: `fadeUp 0.35s var(--ease-out) ${index * 30}ms both`,
        transition: 'opacity 0.15s ease',
      }}>
        {/* Rank */}
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t4)', minWidth: 18, textAlign: 'center', flexShrink: 0 }}>
          {index + 1}
        </span>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: 'var(--t1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {player.playerName}
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>
            {player.gp}G played
          </div>
        </div>

        {/* Stats */}
        {[
          { v: player.avgPts, accent: player.avgPts >= 20 ? 'var(--green)' : undefined },
          { v: player.avgReb, accent: player.avgReb >= 10 ? '#a78bfa' : undefined },
          { v: player.avgAst, accent: player.avgAst >= 8  ? '#38bdf8' : undefined },
          { v: player.fgPct,  accent: undefined },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', minWidth: 36, flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: s.accent || 'var(--t2)' }}>
              {s.v.toFixed(i === 3 ? 1 : 1)}{i === 3 ? '%' : ''}
            </span>
          </div>
        ))}

        <span style={{ fontSize: 14, color: 'var(--t4)', flexShrink: 0 }}>›</span>
      </div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function TeamPage({ params }: { params: { abbr: string } }) {
  const abbr = params.abbr.toUpperCase();
  const { data, isLoading } = useSWR(`/api/teams/${abbr}`, fetcher);
  const { data: seasonData } = useSWR(`/api/teams/season?abbr=${abbr}`, fetcher);
  const record = seasonData?.team ?? null;
  const team = getTeam(abbr);

  if (isLoading) {
    return (
      <PageWrapper>
        <div style={{ paddingTop: 12 }}>
          <div className="skeleton" style={{ height: 14, width: 60, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 160, borderRadius: 22, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 140, borderRadius: 22, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 22 }} />
        </div>
      </PageWrapper>
    );
  }

  if (!data?.success) {
    return (
      <PageWrapper>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <p style={{ color: 'var(--t2)', marginBottom: 16 }}>No data for {abbr} yet</p>
          <Link href="/games" style={{ color: 'var(--green)', fontWeight: 600 }}>← Games</Link>
        </div>
      </PageWrapper>
    );
  }

  const { teamStats, roster, topPerformers }: {
    teamStats: TeamStats;
    roster: RosterPlayer[];
    topPerformers: RosterPlayer[];
  } = data;

  return (
    <PageWrapper>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Back */}
      <Link href="/games" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        color: 'var(--t3)', fontSize: 13, fontWeight: 600,
        marginBottom: 18, paddingTop: 12,
        transition: 'color 0.15s ease',
      }}>
        ‹ Games
      </Link>

      {/* ── TEAM IDENTITY + STATS ── */}
      <div className="reveal reveal-0" style={{
        background: 'var(--s1)', borderRadius: 22,
        border: '1px solid var(--b1)', padding: '22px 20px',
        marginBottom: 12, position: 'relative', overflow: 'hidden',
      }}>
        {/* Color bar */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: team.primary, borderRadius: '22px 0 0 22px',
        }} />
        {/* Radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 0% 50%, ${team.primary}20, transparent 55%)`,
        }} />

        {/* Identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: team.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{abbr}</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 2 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
                {team.city} {team.name}
              </h1>
              {record && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'var(--s3)', border: '1px solid var(--b2)',
                  borderRadius: 8, padding: '3px 9px',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{record.wins}W</span>
                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>–</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>{record.losses}L</span>
                  <span style={{ fontSize: 11, color: 'var(--t4)', marginLeft: 2 }}>
                    ({(record.winPct).toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--t3)' }}>
              {record
                ? `${record.season ?? '2024-25'} season · ${roster.length} players`
                : `${teamStats.gp} game${teamStats.gp !== 1 ? 's' : ''} in database · ${roster.length} players`}
            </p>
          </div>
        </div>

        {/* Team stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
          <StatCell label="PPG"  value={teamStats.avgPts} delay={40} />
          <StatCell label="RPG"  value={teamStats.avgReb} delay={70} />
          <StatCell label="APG"  value={teamStats.avgAst} delay={100} />
          <StatCell label="SPG"  value={teamStats.avgStl} delay={130} />
          <StatCell label="BPG"  value={teamStats.avgBlk} delay={160} />
          <StatCell label="FG%"  value={teamStats.fgPct}  suffix="%" delay={190} />
        </div>

        {/* GP context + official season strip when available */}
        {record ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 8 }}>
              Official Season ({record.gp}G)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {[
                { label: 'PPG',  v: record.pts },
                { label: 'RPG',  v: record.reb },
                { label: 'APG',  v: record.ast },
                { label: 'SPG',  v: record.stl },
                { label: 'BPG',  v: record.blk },
                { label: 'FG%',  v: record.fgPct, suffix: '%' },
              ].map(s => (
                <div key={s.label} className="stat-cell">
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>
                    {s.v.toFixed(1)}{s.suffix ?? ''}
                  </div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, padding: '8px 12px', background: 'var(--s2)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--t4)' }}>Averages across</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)' }}>{teamStats.gp} game{teamStats.gp !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ── TOP PERFORMERS ── */}
      {topPerformers.length > 0 && (
        <div className="reveal reveal-2" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginBottom: 10 }}>
            Top Performers
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {topPerformers.map((p, i) => (
              <TopCard key={p.playerId} player={p} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* ── FULL ROSTER ── */}
      <div className="reveal reveal-3" style={{
        background: 'var(--s1)', borderRadius: 22,
        border: '1px solid var(--b1)', padding: '18px 18px 4px',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: '1px solid var(--b1)', marginBottom: 2 }}>
          <div style={{ width: 18, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span className="section-label">Player</span>
          </div>
          {['PTS', 'REB', 'AST', 'FG%'].map(h => (
            <div key={h} style={{ minWidth: 36, textAlign: 'center', flexShrink: 0 }}>
              <span className="section-label">{h}</span>
            </div>
          ))}
          <div style={{ width: 14, flexShrink: 0 }} />
        </div>

        {roster.map((p, i) => (
          <RosterRow key={p.playerId} player={p} index={i} />
        ))}
      </div>
    </PageWrapper>
  );
}
