// ─────────────────────────────────────────────────────────────
// NBA GAMES — balldontlie API
// Endpoint: GET https://api.balldontlie.io/v1/games?dates[]=YYYY-MM-DD
// Auth: Authorization header (no Bearer prefix)
// ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.balldontlie.io/v1';

function bdlHeaders() {
  return {
    Authorization: process.env.BALLDONTLIE_API_KEY ?? '',
  };
}

export type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed';
};

/**
 * Map balldontlie status string → our internal status enum.
 *
 * balldontlie returns:
 *  - "Final"              → final
 *  - "Final/OT"           → final
 *  - "Halftime"           → in_progress
 *  - "1st Qtr" etc        → in_progress
 *  - "YYYY-MM-DDTHH:mm:ssZ" → scheduled
 *  - "Postponed"          → postponed
 */
function mapStatus(status: string): Game['status'] {
  if (!status) return 'scheduled';
  const s = status.trim().toLowerCase();
  if (s === 'final' || s.startsWith('final/')) return 'final';
  if (s === 'halftime') return 'in_progress';
  if (s === 'postponed') return 'postponed';
  if (/\d+(st|nd|rd|th)\s+qtr/i.test(s)) return 'in_progress';
  if (s === 'ot' || s.startsWith('ot ')) return 'in_progress';
  // ISO date string = not started yet
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return 'scheduled';
  return 'scheduled';
}

export async function fetchNBAGames(
  date = new Date().toISOString().split('T')[0],
): Promise<Game[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);

  try {
    const url = `${BASE_URL}/games?dates[]=${date}&per_page=100`;
    const res = await fetch(url, { headers: bdlHeaders(), signal: ctrl.signal });
    clearTimeout(t);

    if (!res.ok) {
      console.error(`[nba] games ${res.status} ${res.statusText}`);
      return [];
    }

    const body = await res.json();
    const games: any[] = body.data ?? [];

    return games
      .map((g: any) => ({
        id: String(g.id),
        homeTeam: String(g.home_team?.abbreviation ?? ''),
        awayTeam: String(g.visitor_team?.abbreviation ?? ''),
        homeScore: Number(g.home_team_score) || 0,
        awayScore: Number(g.visitor_team_score) || 0,
        status: mapStatus(String(g.status ?? '')),
      }))
      .filter(g => g.homeTeam && g.awayTeam);
  } catch (err: unknown) {
    clearTimeout(t);
    console.error('[nba] fetchNBAGames:', err instanceof Error ? err.message : err);
    return [];
  }
}
