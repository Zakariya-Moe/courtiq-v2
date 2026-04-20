import { NBA_HEADERS } from './constants';

export type SeasonAverages = {
  playerId: string;
  season: string;       // e.g. "2024-25"
  gp: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  min: string;
};

export async function fetchPlayerSeasonStats(
  playerId: string,
): Promise<SeasonAverages | null> {
  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), 6000);

  try {
    const url =
      `https://stats.nba.com/stats/playerprofilev2` +
      `?PlayerID=${playerId}&PerMode=PerGame&LeagueID=00`;

    const res = await fetch(url, { headers: NBA_HEADERS, signal: ctrl.signal });
    clearTimeout(t);

    if (!res.ok) {
      console.error(`[season] playerprofilev2 ${res.status} for ${playerId}`);
      return null;
    }

    const data = await res.json();

    // SeasonTotalsRegularSeason holds per-game averages when PerMode=PerGame
    const set = data.resultSets?.find(
      (r: any) => r.name === 'SeasonTotalsRegularSeason',
    );
    if (!set || !set.rowSet?.length) return null;

    const h = set.headers;
    const idx = {
      season:  h.indexOf('SEASON_ID'),
      gp:      h.indexOf('GP'),
      pts:     h.indexOf('PTS'),
      reb:     h.indexOf('REB'),
      ast:     h.indexOf('AST'),
      stl:     h.indexOf('STL'),
      blk:     h.indexOf('BLK'),
      to:      h.indexOf('TOV'),
      fgPct:   h.indexOf('FG_PCT'),
      fg3Pct:  h.indexOf('FG3_PCT'),
      ftPct:   h.indexOf('FT_PCT'),
      min:     h.indexOf('MIN'),
    };

    if (Object.values(idx).includes(-1)) {
      console.error(`[season] schema changed for player ${playerId}`);
      return null;
    }

    // Most recent season is the last row
    const row = set.rowSet[set.rowSet.length - 1];
    const pct = (v: any) => v == null ? 0 : Math.round(Number(v) * 1000) / 10;

    return {
      playerId,
      season:  String(row[idx.season] || ''),
      gp:      Number(row[idx.gp])   || 0,
      pts:     Math.round((Number(row[idx.pts])  || 0) * 10) / 10,
      reb:     Math.round((Number(row[idx.reb])  || 0) * 10) / 10,
      ast:     Math.round((Number(row[idx.ast])  || 0) * 10) / 10,
      stl:     Math.round((Number(row[idx.stl])  || 0) * 10) / 10,
      blk:     Math.round((Number(row[idx.blk])  || 0) * 10) / 10,
      to:      Math.round((Number(row[idx.to])   || 0) * 10) / 10,
      fgPct:   pct(row[idx.fgPct]),
      fg3Pct:  pct(row[idx.fg3Pct]),
      ftPct:   pct(row[idx.ftPct]),
      min:     String(row[idx.min] || ''),
    };
  } catch (err: unknown) {
    clearTimeout(t);
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`[season] timeout for ${playerId}`);
    } else {
      console.error(`[season] failed for ${playerId}: ${msg}`);
    }
    return null;
  }
}
