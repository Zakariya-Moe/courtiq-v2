'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState } from 'react';
import { getTeam } from '@/lib/utils/teams';
import Sparkline from '../components/Sparkline';
import AnimatedNumber from '../components/AnimatedNumber';
import PageWrapper from '../components/PageWrapper';
import SignalBadge from '../components/SignalBadge';
import { generatePlayerSignals, getPrimarySignal } from '@/lib/analytics/signals';
import { isHighPriority } from '@/lib/analytics/signal-diff';
import { recordSignalEvent } from '@/lib/analytics/signal-events';
import { isFavorite } from '@/lib/user/favorites';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Player = {
  playerId: string; playerName: string; teamAbbr: string;
  avgPts: number; avgReb: number; avgAst: number;
  gp: number; trend: number; sparkline: number[];
};

const SORTS = [
  { key: 'pts',   label: 'Points' },
  { key: 'reb',   label: 'Rebounds' },
  { key: 'ast',   label: 'Assists' },
  { key: 'trend', label: '🔥 Hot' },
] as const;
type SortKey = typeof SORTS[number]['key'];

function PlayerCard({ p, rank, sortKey, delay }: {
  p: Player; rank: number; sortKey: SortKey; delay: number;
}) {
  const team = getTeam(p.teamAbbr);
  const isUp = p.trend >= 0;
  const spkColor = isUp ? '#00C805' : '#FF3B30';
  const stat     = sortKey === 'reb' ? p.avgReb : sortKey === 'ast' ? p.avgAst : p.avgPts;
  const statLbl  = sortKey === 'reb' ? 'REB' : sortKey === 'ast' ? 'AST' : 'PTS';

  // Phase 7: compute signal from sparkline data
  const recentGames = p.sparkline.map(pts => ({ points: pts, rebounds: 0, assists: 0 }));
  const signal = getPrimarySignal(generatePlayerSignals(recentGames));

  // Phase 9: record high-priority signals into the in-memory feed
  if (signal && isHighPriority(signal)) {
    recordSignalEvent(p.playerId, p.playerName, p.teamAbbr, signal);
  }

  // Phase 10: is this player a favorite?
  const isFav = isFavorite(p.playerId);

  return (
    <Link href={`/players/${p.playerId}`} style={{ display: 'block' }}>
      <div
        className="player-row"
        style={{
          animationDelay: `${delay}ms`,
          animation: `fadeUp 0.45s var(--ease-out) ${delay}ms both`,
          // Phase 8 §3: border accent for high-priority signals
          ...(signal && isHighPriority(signal) ? {
            borderColor: signal.type === 'breakout' ? 'rgba(0,200,5,0.25)' : 'rgba(255,100,0,0.22)',
            boxShadow: signal.type === 'breakout'
              ? '0 0 0 1px rgba(0,200,5,0.12) inset'
              : '0 0 0 1px rgba(255,100,0,0.10) inset',
          } : {}),
        }}
      >
        {/* Rank */}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t4)', minWidth: 20, textAlign: 'center' }}>
          {rank}
        </span>

        {/* Team badge */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: team.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{p.teamAbbr}</span>
        </div>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
            {isFav && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#00C805" stroke="none" style={{ flexShrink: 0 }}>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            )}
            <div style={{
              fontSize: 14, fontWeight: 600, color: isFav ? 'var(--t1)' : 'var(--t1)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{p.playerName}</div>
            {signal && <SignalBadge signal={signal} size="sm" isNew={isHighPriority(signal)} />}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
            {team.name} · {p.gp}G
          </div>
        </div>

        {/* Sparkline */}
        {p.sparkline.length >= 2 && (
          <Sparkline data={p.sparkline} width={58} height={30} color={spkColor} />
        )}

        {/* Stat + trend */}
        <div style={{ textAlign: 'right', minWidth: 54, flexShrink: 0 }}>
          <div style={{
            fontSize: 20, fontWeight: 700, letterSpacing: -0.6,
            color: 'var(--t1)', fontVariantNumeric: 'tabular-nums',
          }}>
            <AnimatedNumber value={stat} decimals={1} duration={700} />
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, marginTop: 2,
            color: isUp ? 'var(--green)' : 'var(--red)',
          }}>
            {isUp ? '+' : ''}{p.trend.toFixed(1)}%
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 16,
    }}>
      <div className="skeleton" style={{ width: 20, height: 13, flexShrink: 0 }} />
      <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 13, width: 130, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 10, width: 70 }} />
      </div>
      <div className="skeleton" style={{ width: 58, height: 30, borderRadius: 6 }} />
      <div style={{ textAlign: 'right' }}>
        <div className="skeleton" style={{ height: 19, width: 38, marginBottom: 5, marginLeft: 'auto' }} />
        <div className="skeleton" style={{ height: 11, width: 30, marginLeft: 'auto' }} />
      </div>
    </div>
  );
}

export default function HotPage() {
  const { data, isLoading, error } = useSWR('/api/hot-players', fetcher, { refreshInterval: 60000 });
  const [sort, setSort] = useState<SortKey>('pts');

  const players: Player[] = data?.players || [];

  // Phase 7: signal-boosted sort — hot/breakout players surface higher
  function favBoost(p: Player): number {
    return isFavorite(p.playerId) ? 10 : 0;
  }

  function signalBoost(p: Player): number {
    const games = p.sparkline.map(pts => ({ points: pts, rebounds: 0, assists: 0 }));
    const sig = getPrimarySignal(generatePlayerSignals(games));
    if (!sig) return 0;
    if (sig.type === 'breakout') return 4;
    if (sig.type === 'hot')      return 3;
    if (sig.type === 'consistent') return 1;
    if (sig.type === 'cold')     return -1;
    if (sig.type === 'declining') return -2;
    return 0;
  }

  const sorted = [...players].sort((a, b) => {
    if (sort === 'trend') return b.trend - a.trend;
    const boostDiff = (favBoost(b) + signalBoost(b)) - (favBoost(a) + signalBoost(a));
    if (sort !== 'trend' && boostDiff !== 0) return boostDiff;
    if (sort === 'reb') return b.avgReb - a.avgReb;
    if (sort === 'ast') return b.avgAst - a.avgAst;
    return b.avgPts - a.avgPts;
  });

  const leader = sorted[0];

  return (
    <PageWrapper>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="reveal reveal-0" style={{ paddingTop: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, marginBottom: 3 }}>Trending</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)' }}>Top performers · Last 7 days</p>
      </div>

      {/* Hero leader card */}
      {!isLoading && leader && (
        <Link href={`/players/${leader.playerId}`} style={{ display: 'block' }}>
          <div className="card reveal reveal-1" style={{
            padding: '20px', marginBottom: 16,
          }}>
            {/* Radial glow behind */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16,
              background: `radial-gradient(ellipse at 10% 50%, ${getTeam(leader.teamAbbr).primary}28, transparent 55%)`,
            }} />

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 12 }}>
              🔥 Top Performer
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: getTeam(leader.teamAbbr).primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{leader.teamAbbr}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.3 }}>{leader.playerName}</div>
                <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 1 }}>{getTeam(leader.teamAbbr).name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1.5, color: 'var(--green)', lineHeight: 1 }}>
                  <AnimatedNumber value={leader.avgPts} decimals={1} duration={900} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3 }}>PPG</div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Sort tabs */}
      <div className="scroll-x reveal reveal-2" style={{ marginBottom: 14 }}>
        {SORTS.map(s => (
          <button
            key={s.key}
            className={`chip ${sort === s.key ? 'active' : ''}`}
            onClick={() => setSort(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      {!isLoading && sorted.length > 0 && (
        <div className="reveal reveal-3" style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '0 16px', marginBottom: 8,
        }}>
          <div style={{ width: 20 }} />
          <div style={{ width: 42, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span className="section-label">Player</span>
          </div>
          <div style={{ width: 58 }} />
          <div style={{ minWidth: 54, textAlign: 'right' }}>
            <span className="section-label">
              {sort === 'reb' ? 'REB' : sort === 'ast' ? 'AST' : 'PTS'} / Δ
            </span>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--t3)' }}>
          <p>Failed to load players</p>
        </div>
      )}

      {!isLoading && !error && sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 20px' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>📊</p>
          <p style={{ color: 'var(--t2)', fontSize: 16, marginBottom: 6 }}>No player data yet</p>
          <p style={{ color: 'var(--t3)', fontSize: 13 }}>Stats appear after games are ingested</p>
        </div>
      )}

      {!isLoading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((p, i) => (
            <PlayerCard
              key={p.playerId}
              p={p}
              rank={i + 1}
              sortKey={sort}
              delay={i * 45}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
