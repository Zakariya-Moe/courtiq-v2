// ─────────────────────────────────────────────────────────────
// SHARE PAYLOADS
// Pure functions. Build Web Share API payloads from page data.
// ─────────────────────────────────────────────────────────────

import type { Signal } from '@/lib/analytics/signals';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://courtiq.app';

// ── Player share ──────────────────────────────────────────────
interface PlayerShareInput {
  playerId: string;
  playerName: string;
  teamAbbr: string;
  pts: number;
  reb: number;
  ast: number;
  gp: number;
  signal?: Signal | null;
  isSeason: boolean; // true = season avgs, false = recent
}

export function buildPlayerSharePayload(p: PlayerShareInput) {
  const statLine = `${p.pts} PTS · ${p.reb} REB · ${p.ast} AST`;
  const context  = p.isSeason ? `Season avg (${p.gp}G)` : `Last ${p.gp} games`;
  const signalLine = p.signal ? `\n${p.signal.label}` : '';
  const url      = `${BASE_URL}/players/${p.playerId}`;

  return {
    title: `${p.playerName} — CourtIQ`,
    text:  `${p.playerName} (${p.teamAbbr})\n${statLine}\n${context}${signalLine}`,
    url,
  };
}

// ── Game share ────────────────────────────────────────────────
type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed';

interface GameShareInput {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: GameStatus;
}

export function buildGameSharePayload(g: GameShareInput) {
  const url     = `${BASE_URL}/games/${g.gameId}`;
  const isLive  = g.status === 'in_progress';
  const isFinal = g.status === 'final';

  const scoreLine = `${g.awayTeam} ${g.awayScore} — ${g.homeTeam} ${g.homeScore}`;
  const statusStr = isLive ? '🔴 LIVE' : isFinal ? 'Final' : 'Upcoming';

  return {
    title: `${g.awayTeam} vs ${g.homeTeam} — CourtIQ`,
    text:  `${statusStr}\n${scoreLine}`,
    url,
  };
}
