// ─────────────────────────────────────────────────────────────
// NBA BOX SCORES — balldontlie API
//
// Tier breakdown:
//   GOAT ($39.99/mo)  → /v1/box_scores or /v1/box_scores/live
//   ALL-STAR ($9.99)  → /v1/stats?game_ids[]=ID  (player stats per game)
//   Free              → games only, no player stats
//
// We use /v1/stats (ALL-STAR+) as primary, with a graceful fallback
// if the key is on a lower tier. The cron skips player stat ingestion
// when the endpoint returns 401/403.
// ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.balldontlie.io/v1';

function bdlHeaders() {
  return { Authorization: process.env.BALLDONTLIE_API_KEY ?? '' };
}

export type PlayerStat = {
  gameId: string;
  playerId: string;
  playerName: string;
  teamAbbr: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  minutes: string;
  fgMade: number;
  fgAttempted: number;
  fg3Made: number;
  fg3Attempted: number;
  ftMade: number;
  ftAttempted: number;
};

/**
 * Convert balldontlie "mm:ss" or plain "mm" minutes to "mm:ss" string.
 */
function normMinutes(raw: any): string {
  if (!raw) return '0:00';
  const s = String(raw).trim();
  if (s.includes(':')) return s;
  const n = parseInt(s) || 0;
  return `${n}:00`;
}

/**
 * Fetch player stats for a single game via /v1/stats.
 * Requires ALL-STAR tier or above.
 * Returns [] on any error or insufficient tier (graceful degradation).
 */
export async function fetchBoxScore(gameId: string): Promise<PlayerStat[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);

  try {
    // Paginate — default per_page is 25, games have ~24-28 players
    const url = `${BASE_URL}/stats?game_ids[]=${gameId}&per_page=100`;
    const res = await fetch(url, { headers: bdlHeaders(), signal: ctrl.signal });
    clearTimeout(t);

    if (res.status === 401 || res.status === 403) {
      console.warn(`[boxscore] Tier too low for /v1/stats (${res.status}). Upgrade to ALL-STAR for player stats.`);
      return [];
    }

    if (!res.ok) {
      console.error(`[boxscore] /v1/stats game ${gameId}: ${res.status}`);
      return [];
    }

    const body = await res.json();
    const rows: any[] = body.data ?? [];

    return rows
      .filter((r: any) => r.min && r.min !== '0' && r.min !== '0:00')
      .map((r: any) => ({
        gameId: String(r.game?.id ?? gameId),
        playerId: String(r.player?.id ?? ''),
        playerName: [r.player?.first_name, r.player?.last_name].filter(Boolean).join(' '),
        teamAbbr: String(r.team?.abbreviation ?? ''),
        points: Number(r.pts) || 0,
        rebounds: Number(r.reb) || 0,
        assists: Number(r.ast) || 0,
        steals: Number(r.stl) || 0,
        blocks: Number(r.blk) || 0,
        turnovers: Number(r.turnover) || 0,
        minutes: normMinutes(r.min),
        fgMade: Number(r.fgm) || 0,
        fgAttempted: Number(r.fga) || 0,
        fg3Made: Number(r.fg3m) || 0,
        fg3Attempted: Number(r.fg3a) || 0,
        ftMade: Number(r.ftm) || 0,
        ftAttempted: Number(r.fta) || 0,
      }))
      .filter(s => s.playerId);
  } catch (err: unknown) {
    clearTimeout(t);
    console.error(`[boxscore] fetchBoxScore ${gameId}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Fetch live box scores (GOAT tier: /v1/box_scores/live).
 * Returns all in-progress games with embedded player arrays.
 * Falls back gracefully to [] if tier is insufficient.
 */
export async function fetchLiveBoxScores(): Promise<PlayerStat[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(`${BASE_URL}/box_scores/live`, {
      headers: bdlHeaders(),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (res.status === 401 || res.status === 403) {
      console.warn('[boxscore] GOAT tier required for /v1/box_scores/live. Falling back to /v1/stats.');
      return [];
    }

    if (!res.ok) {
      console.error(`[boxscore] live box scores ${res.status}`);
      return [];
    }

    const body = await res.json();
    const games: any[] = body.data ?? [];
    const out: PlayerStat[] = [];

    for (const game of games) {
      const gid = String(game.id ?? '');
      for (const side of ['home_team', 'visitor_team'] as const) {
        const team = game[side];
        if (!team?.players) continue;
        const abbr = String(team.abbreviation ?? '');
        for (const p of team.players) {
          if (!p.min || p.min === '0' || p.min === '0:00') continue;
          out.push({
            gameId: gid,
            playerId: String(p.id ?? ''),
            playerName: [p.first_name, p.last_name].filter(Boolean).join(' '),
            teamAbbr: abbr,
            points: Number(p.pts) || 0,
            rebounds: Number(p.reb) || 0,
            assists: Number(p.ast) || 0,
            steals: Number(p.stl) || 0,
            blocks: Number(p.blk) || 0,
            turnovers: Number(p.turnover) || 0,
            minutes: normMinutes(p.min),
            fgMade: Number(p.fgm) || 0,
            fgAttempted: Number(p.fga) || 0,
            fg3Made: Number(p.fg3m) || 0,
            fg3Attempted: Number(p.fg3a) || 0,
            ftMade: Number(p.ftm) || 0,
            ftAttempted: Number(p.fta) || 0,
          });
        }
      }
    }

    return out.filter(s => s.playerId);
  } catch (err: unknown) {
    clearTimeout(t);
    console.error('[boxscore] fetchLiveBoxScores:', err instanceof Error ? err.message : err);
    return [];
  }
}
