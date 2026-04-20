import { NBA_HEADERS } from './constants';

export type Game = {
  id: string; homeTeam: string; awayTeam: string;
  homeScore: number; awayScore: number;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed';
};

export async function fetchNBAGames(date = new Date().toISOString().split('T')[0]): Promise<Game[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(
      `https://stats.nba.com/stats/scoreboardv2?GameDate=${date}&LeagueID=00`,
      { headers: NBA_HEADERS, signal: ctrl.signal }
    );
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    const gh = data.resultSets?.find((r: any) => r.name === 'GameHeader');
    const ls = data.resultSets?.find((r: any) => r.name === 'LineScore');
    if (!gh || !ls) return [];

    const hi = { id: gh.headers.indexOf('GAME_ID'), home: gh.headers.indexOf('HOME_TEAM_ABBREVIATION'), away: gh.headers.indexOf('VISITOR_TEAM_ABBREVIATION'), status: gh.headers.indexOf('GAME_STATUS_TEXT'), hid: gh.headers.indexOf('HOME_TEAM_ID'), aid: gh.headers.indexOf('VISITOR_TEAM_ID') };
    const li = { id: ls.headers.indexOf('GAME_ID'), tid: ls.headers.indexOf('TEAM_ID'), pts: ls.headers.indexOf('PTS') };
    if (Object.values(hi).includes(-1) || Object.values(li).includes(-1)) return [];

    const scoreMap = new Map<string, Record<string, number>>();
    for (const r of ls.rowSet) {
      const gid = String(r[li.id]);
      if (!scoreMap.has(gid)) scoreMap.set(gid, {});
      scoreMap.get(gid)![String(r[li.tid])] = Number(r[li.pts]) || 0;
    }

    return gh.rowSet
      .filter((r: any) => r[hi.id] && r[hi.home] && r[hi.away])
      .map((r: any) => {
        const s = String(r[hi.status] || '');
        const scores = scoreMap.get(String(r[hi.id])) || {};
        let status: Game['status'] = 'scheduled';
        if (s.toLowerCase().includes('postponed')) status = 'postponed';
        else if (s.includes('Final') || s.includes('OT')) status = 'final';
        else if (s.includes('Q') || s.includes('Halftime')) status = 'in_progress';
        return {
          id: String(r[hi.id]), homeTeam: String(r[hi.home]), awayTeam: String(r[hi.away]),
          homeScore: scores[String(r[hi.hid])] || 0, awayScore: scores[String(r[hi.aid])] || 0, status,
        };
      });
  } catch { clearTimeout(t); return []; }
}
