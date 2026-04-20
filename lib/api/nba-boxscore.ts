import { NBA_HEADERS } from './constants';

export type PlayerStat = {
  gameId: string; playerId: string; playerName: string; teamAbbr: string;
  points: number; rebounds: number; assists: number; steals: number;
  blocks: number; turnovers: number; minutes: string;
  fgMade: number; fgAttempted: number; fg3Made: number; fg3Attempted: number;
  ftMade: number; ftAttempted: number;
};

export async function fetchBoxScore(gameId: string): Promise<PlayerStat[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(
      `https://stats.nba.com/stats/boxscoretraditionalv2?GameID=${gameId}&StartPeriod=0&EndPeriod=10&StartRange=0&EndRange=28800&RangeType=0`,
      { headers: NBA_HEADERS, signal: ctrl.signal }
    );
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    const set = data.resultSets?.find((r: any) => r.name === 'PlayerStats');
    if (!set) return [];
    const h = set.headers;
    const idx = {
      gameId: h.indexOf('GAME_ID'), playerId: h.indexOf('PLAYER_ID'), playerName: h.indexOf('PLAYER_NAME'),
      teamAbbr: h.indexOf('TEAM_ABBREVIATION'), minutes: h.indexOf('MIN'),
      fgMade: h.indexOf('FGM'), fgAttempted: h.indexOf('FGA'), fg3Made: h.indexOf('FG3M'),
      fg3Attempted: h.indexOf('FG3A'), ftMade: h.indexOf('FTM'), ftAttempted: h.indexOf('FTA'),
      rebounds: h.indexOf('REB'), assists: h.indexOf('AST'), steals: h.indexOf('STL'),
      blocks: h.indexOf('BLK'), turnovers: h.indexOf('TO'), points: h.indexOf('PTS'),
    };
    if (Object.values(idx).includes(-1)) return [];
    return set.rowSet
      .filter((r: any) => r[idx.minutes] && r[idx.minutes] !== '0:00')
      .map((r: any) => ({
        gameId: String(r[idx.gameId]), playerId: String(r[idx.playerId]),
        playerName: String(r[idx.playerName]), teamAbbr: String(r[idx.teamAbbr]),
        points: Number(r[idx.points]) || 0, rebounds: Number(r[idx.rebounds]) || 0,
        assists: Number(r[idx.assists]) || 0, steals: Number(r[idx.steals]) || 0,
        blocks: Number(r[idx.blocks]) || 0, turnovers: Number(r[idx.turnovers]) || 0,
        minutes: String(r[idx.minutes]), fgMade: Number(r[idx.fgMade]) || 0,
        fgAttempted: Number(r[idx.fgAttempted]) || 0, fg3Made: Number(r[idx.fg3Made]) || 0,
        fg3Attempted: Number(r[idx.fg3Attempted]) || 0, ftMade: Number(r[idx.ftMade]) || 0,
        ftAttempted: Number(r[idx.ftAttempted]) || 0,
      }));
  } catch { clearTimeout(t); return []; }
}
