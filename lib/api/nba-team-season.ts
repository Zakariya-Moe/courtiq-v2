import { NBA_HEADERS } from './constants';

export type TeamSeasonStats = {
  teamId: string;
  teamAbbr: string;
  teamName: string;
  wins: number;
  losses: number;
  winPct: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  gp: number;
};

let _cache: { data: TeamSeasonStats[]; fetchedAt: number } | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour in-process cache

export async function fetchAllTeamSeasonStats(): Promise<TeamSeasonStats[]> {
  // In-process cache so multiple requests in the same server instance reuse the data
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_MS) {
    return _cache.data;
  }

  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), 8000);

  try {
    const url =
      `https://stats.nba.com/stats/leaguedashteamstats` +
      `?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=` +
      `&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0` +
      `&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame` +
      `&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N` +
      `&Season=2024-25&SeasonSegment=&SeasonType=Regular+Season` +
      `&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`;

    const res = await fetch(url, { headers: NBA_HEADERS, signal: ctrl.signal });
    clearTimeout(t);

    if (!res.ok) {
      console.error(`[team-season] leaguedashteamstats ${res.status}`);
      return _cache?.data ?? [];
    }

    const data = await res.json();
    const set  = data.resultSets?.find((r: any) => r.name === 'LeagueDashTeamStats');
    if (!set) return _cache?.data ?? [];

    const h   = set.headers;
    const idx = {
      teamId:   h.indexOf('TEAM_ID'),
      teamAbbr: h.indexOf('TEAM_ABBREVIATION') !== -1 ? h.indexOf('TEAM_ABBREVIATION') : h.indexOf('TEAM_NAME'), // fallback
      teamName: h.indexOf('TEAM_NAME'),
      gp:       h.indexOf('GP'),
      wins:     h.indexOf('W'),
      losses:   h.indexOf('L'),
      winPct:   h.indexOf('W_PCT'),
      pts:      h.indexOf('PTS'),
      reb:      h.indexOf('REB'),
      ast:      h.indexOf('AST'),
      stl:      h.indexOf('STL'),
      blk:      h.indexOf('BLK'),
      fgPct:    h.indexOf('FG_PCT'),
      fg3Pct:   h.indexOf('FG3_PCT'),
      ftPct:    h.indexOf('FT_PCT'),
    };

    // Check for TEAM_ABBREVIATION specifically
    const abbrIdx = h.indexOf('TEAM_ABBREVIATION');

    const teams: TeamSeasonStats[] = set.rowSet.map((row: any) => {
      const pct = (v: any) => v == null ? 0 : Math.round(Number(v) * 1000) / 10;
      const r1  = (v: any) => Math.round((Number(v) || 0) * 10) / 10;

      // Derive abbreviation from team name if column missing
      const rawName: string = String(row[idx.teamName] || '');
      const abbr = abbrIdx !== -1
        ? String(row[abbrIdx])
        : rawName.split(' ').pop() ?? rawName; // last word of name as fallback

      return {
        teamId:   String(row[idx.teamId]),
        teamAbbr: abbr,
        teamName: rawName,
        gp:       Number(row[idx.gp])     || 0,
        wins:     Number(row[idx.wins])   || 0,
        losses:   Number(row[idx.losses]) || 0,
        winPct:   pct(row[idx.winPct]),
        pts:      r1(row[idx.pts]),
        reb:      r1(row[idx.reb]),
        ast:      r1(row[idx.ast]),
        stl:      r1(row[idx.stl]),
        blk:      r1(row[idx.blk]),
        fgPct:    pct(row[idx.fgPct]),
        fg3Pct:   pct(row[idx.fg3Pct]),
        ftPct:    pct(row[idx.ftPct]),
      };
    });

    _cache = { data: teams, fetchedAt: Date.now() };
    return teams;
  } catch (err: unknown) {
    clearTimeout(t);
    console.error('[team-season] fetch failed:', err instanceof Error ? err.message : String(err));
    return _cache?.data ?? [];
  }
}

export async function fetchTeamSeasonStats(
  abbr: string,
): Promise<TeamSeasonStats | null> {
  const all = await fetchAllTeamSeasonStats();
  return all.find(t => t.teamAbbr.toUpperCase() === abbr.toUpperCase()) ?? null;
}
