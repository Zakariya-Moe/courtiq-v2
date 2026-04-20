'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState } from 'react';
import { getTeam, calcTS, calcEFG, fmtMin } from '@/lib/utils/teams';
import AnimatedNumber from '../../components/AnimatedNumber';
import PageWrapper from '../../components/PageWrapper';
import ShareButton from '../../components/ShareButton';
import { buildGameSharePayload } from '@/lib/share/payloads';

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

const STAT_COLS = [
  { key: 'points' as const,   label: 'PTS', highlight: (v: number) => v >= 20 ? 'var(--green)' : null },
  { key: 'rebounds' as const, label: 'REB', highlight: (v: number) => v >= 10 ? '#a78bfa' : null },
  { key: 'assists' as const,  label: 'AST', highlight: (v: number) => v >= 8 ? '#38bdf8' : null },
  { key: 'steals' as const,   label: 'STL', highlight: () => null },
  { key: 'blocks' as const,   label: 'BLK', highlight: () => null },
];

function PlayerRow({ p, index }: { p: Player; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const ts  = calcTS(p.points, p.fg_attempted, p.ft_attempted);
  const efg = calcEFG(p.fg_made, p.fg3_made, p.fg_attempted);
  const fgPct = p.fg_attempted > 0 ? Math.round((p.fg_made / p.fg_attempted) * 100) : 0;

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        borderBottom: '1px solid var(--b1)',
        padding: '11px 0',
        cursor: 'pointer',
        animation: `fadeUp 0.4s var(--ease-out) ${index * 35}ms both`,
        transition: 'opacity 0.15s ease',
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/players/${p.player_id}`}
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {p.player_name}
          </Link>
          <span style={{ fontSize: 11, color: 'var(--t4)' }}>{fmtMin(p.minutes)}</span>
        </div>
        {STAT_COLS.map(col => (
          <div key={col.key} style={{ textAlign: 'center', minWidth: 30 }}>
            <span style={{
              fontSize: 15, fontWeight: 600,
              color: col.highlight(p[col.key]) || 'var(--t1)',
            }}>
              {p[col.key]}
            </span>
          </div>
        ))}
        <span style={{
          fontSize: 14, color: 'var(--t4)',
          transition: 'transform 0.2s ease',
          display: 'inline-block',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>›</span>
      </div>

      {/* Expanded advanced stats */}
      {expanded && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8, marginTop: 12, paddingTop: 12,
          borderTop: '1px solid var(--b1)',
          animation: 'fadeUp 0.2s var(--ease-out) both',
        }}>
          {[
            { label: 'FG%',  value: `${fgPct}%` },
            { label: 'FG',   value: `${p.fg_made}/${p.fg_attempted}` },
            { label: '3PT',  value: `${p.fg3_made}/${p.fg3_attempted}` },
            { label: 'TS%',  value: `${ts}%` },
            { label: 'eFG%', value: `${efg}%` },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--t4)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamSection({ players, abbr }: { players: Player[]; abbr: string }) {
  const team = getTeam(abbr);
  const teamPlayers = players.filter(p => p.team_abbr === abbr);
  if (!teamPlayers.length) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 3, height: 16, background: team.primary, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--t3)' }}>
          {team.city} {team.name}
        </span>
      </div>
      {/* Column labels */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 6, borderBottom: '1px solid var(--b1)' }}>
        <div style={{ flex: 1 }}>
          <span className="section-label">Player</span>
        </div>
        {STAT_COLS.map(c => (
          <div key={c.key} style={{ minWidth: 30, textAlign: 'center' }}>
            <span className="section-label">{c.label}</span>
          </div>
        ))}
        <div style={{ width: 14 }} />
      </div>
      {teamPlayers.map((p, i) => <PlayerRow key={p.player_id} p={p} index={i} />)}
    </div>
  );
}

export default function GamePage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useSWR(`/api/games/${params.id}`, fetcher, { refreshInterval: 30000 });
  const [teamFilter, setTeamFilter] = useState<'all' | 'away' | 'home'>('all');

  if (isLoading) {
    return (
      <PageWrapper>
        <div style={{ paddingTop: 16 }}>
          <div className="skeleton" style={{ height: 14, width: 80, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 20, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 20 }} />
        </div>
      </PageWrapper>
    );
  }

  if (!data?.success) {
    return (
      <PageWrapper>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <p style={{ color: 'var(--t2)', marginBottom: 16 }}>Game not found</p>
          <Link href="/games" style={{ color: 'var(--green)', fontWeight: 600 }}>← Back</Link>
        </div>
      </PageWrapper>
    );
  }

  const game: Game = data.game;
  const players: Player[] = data.players || [];
  const isLive  = game.status === 'in_progress';
  const isFinal = game.status === 'final';
  const ht = getTeam(game.home_team);
  const at = getTeam(game.away_team);
  const homeWins = isFinal && game.home_score > game.away_score;
  const awayWins = isFinal && game.away_score > game.home_score;
  const total = game.home_score + game.away_score;

  const filteredPlayers = teamFilter === 'away'
    ? players.filter(p => p.team_abbr === game.away_team)
    : teamFilter === 'home'
    ? players.filter(p => p.team_abbr === game.home_team)
    : players;

  return (
    <PageWrapper>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes barGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>

      {/* Back */}
      <Link href="/games" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        color: 'var(--t3)', fontSize: 13, fontWeight: 600,
        marginBottom: 18, paddingTop: 12,
        transition: 'color 0.15s ease',
      }}>
        ‹ Games
      </Link>

      {/* ── SECTION 1: SCORE HERO ── */}
      <div className="reveal reveal-0" style={{
        background: 'var(--s1)', borderRadius: 22,
        border: '1px solid var(--b1)', padding: '24px 20px',
        marginBottom: 12, position: 'relative', overflow: 'hidden',
      }}>
        {/* Gradient top strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${at.primary}, ${ht.primary})`,
        }} />

        {/* Background team glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 20% 50%, ${at.primary}18, transparent 55%),
                       radial-gradient(ellipse at 80% 50%, ${ht.primary}18, transparent 55%)`,
        }} />

        {/* Status badge + share */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          {/* Left spacer — keeps badge centered */}
          <div style={{ width: 36 }} />

          {/* Status badge */}
          <div style={{ textAlign: 'center' }}>
            {isLive ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--green-10)', border: '1px solid var(--green-20)',
                borderRadius: 100, padding: '5px 14px',
              }}>
                <div className="live-dot" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', letterSpacing: 1 }}>LIVE</span>
              </div>
            ) : (
              <span style={{
                fontSize: 12, fontWeight: 700, letterSpacing: 1,
                color: isFinal ? 'var(--t4)' : 'var(--amber)',
              }}>
                {isFinal ? 'FINAL' : 'UPCOMING'}
              </span>
            )}
          </div>

          {/* Share */}
          <ShareButton payload={buildGameSharePayload({
            gameId: game.id,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            homeScore: game.home_score,
            awayScore: game.away_score,
            status: game.status as any,
          })} />
        </div>

        {/* Score grid: away – score – home */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
          {/* Away */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>{game.away_team}</div>
            <Link href={`/teams/${game.away_team}`} style={{ fontSize: 15, fontWeight: 600, color: awayWins ? 'var(--t1)' : 'var(--t2)', display: 'block', transition: 'color 0.15s ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
              onMouseLeave={e => (e.currentTarget.style.color = awayWins ? 'var(--t1)' : 'var(--t2)')}>
              {at.name}
            </Link>
          </div>

          {/* Scores */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px' }}>
            <span className="hero-score" style={{ color: awayWins ? '#fff' : isFinal ? 'var(--t2)' : '#fff' }}>
              {isLive ? <AnimatedNumber value={game.away_score} duration={400} /> : game.away_score}
            </span>
            <span style={{ fontSize: 22, color: 'var(--b3)', fontWeight: 300 }}>–</span>
            <span className="hero-score" style={{ color: homeWins ? '#fff' : isFinal ? 'var(--t2)' : '#fff' }}>
              {isLive ? <AnimatedNumber value={game.home_score} duration={400} /> : game.home_score}
            </span>
          </div>

          {/* Home */}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>{game.home_team}</div>
            <Link href={`/teams/${game.home_team}`} style={{ fontSize: 15, fontWeight: 600, color: homeWins ? 'var(--t1)' : 'var(--t2)', display: 'block', transition: 'color 0.15s ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
              onMouseLeave={e => (e.currentTarget.style.color = homeWins ? 'var(--t1)' : 'var(--t2)')}>
              {ht.name}
            </Link>
          </div>
        </div>

        {/* ── SECTION 2: MOMENTUM BAR ── */}
        {total > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', gap: 3, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: 6, background: at.primary,
                flex: game.away_score,
                transformOrigin: 'left',
                animation: 'barGrow 0.9s var(--ease-out) 0.2s both',
                transition: 'flex 1.2s var(--ease-out)',
              }} />
              <div style={{
                height: 6, background: ht.primary,
                flex: game.home_score,
                transformOrigin: 'right',
                animation: 'barGrow 0.9s var(--ease-out) 0.2s both',
                transition: 'flex 1.2s var(--ease-out)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>{game.away_team} {((game.away_score / total) * 100).toFixed(0)}%</span>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>{game.home_team} {((game.home_score / total) * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Quick stat row */}
        {players.length > 0 && (() => {
          const topScorer = [...players].sort((a, b) => b.points - a.points)[0];
          const topRebounder = [...players].sort((a, b) => b.rebounds - a.rebounds)[0];
          return (
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              {[
                { label: 'Top Scorer', value: `${topScorer.points} PTS`, name: topScorer.player_name.split(' ').pop() },
                { label: 'Top Rebounder', value: `${topRebounder.rebounds} REB`, name: topRebounder.player_name.split(' ').pop() },
              ].map(stat => (
                <div key={stat.label} style={{
                  flex: 1, background: 'var(--s2)', borderRadius: 10,
                  padding: '10px 12px', border: '1px solid var(--b1)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', letterSpacing: -0.3 }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{stat.name}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── SECTION 3: PLAYER STATS ── */}
      {players.length > 0 ? (
        <div className="reveal reveal-2">
          {/* Section header + team filter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 }}>
            <h2 className="section-title">Box Score</h2>
            <div style={{ display: 'flex', gap: 4, background: 'var(--s2)', borderRadius: 10, padding: 3 }}>
              {(['all', 'away', 'home'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setTeamFilter(k)}
                  style={{
                    padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                    background: teamFilter === k ? 'var(--s3)' : 'transparent',
                    color: teamFilter === k ? 'var(--t1)' : 'var(--t3)',
                    transition: 'all 0.15s ease', border: 'none', cursor: 'pointer',
                  }}
                >
                  {k === 'away' ? game.away_team : k === 'home' ? game.home_team : 'All'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--s1)', borderRadius: 18, border: '1px solid var(--b1)', padding: '0 16px' }}>
            {teamFilter === 'all' ? (
              <>
                <TeamSection players={players} abbr={game.away_team} />
                <TeamSection players={players} abbr={game.home_team} />
              </>
            ) : (
              <TeamSection players={filteredPlayers} abbr={teamFilter === 'away' ? game.away_team : game.home_team} />
            )}
          </div>
        </div>
      ) : (
        <div className="reveal reveal-2" style={{
          background: 'var(--s1)', borderRadius: 18, border: '1px solid var(--b1)',
          padding: '36px 20px', textAlign: 'center',
        }}>
          <p style={{ color: 'var(--t2)', fontSize: 14 }}>
            {isLive || isFinal ? 'Stats loading...' : 'Stats available at tip-off'}
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
