import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

// Cache helper — s-maxage=60s, stale-while-revalidate=120s
function cachedJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}



export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data: stats, error } = await supabase
    .from('player_stats')
    .select('*, games(home_team, away_team, status, last_updated)')
    .eq('player_id', params.id)
    .order('last_updated', { referencedTable: 'games', ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  if (!stats?.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const tot = stats.reduce((a, s) => ({
    pts: a.pts + (s.points || 0), reb: a.reb + (s.rebounds || 0), ast: a.ast + (s.assists || 0),
    stl: a.stl + (s.steals || 0), blk: a.blk + (s.blocks || 0), to: a.to + (s.turnovers || 0),
    fgm: a.fgm + (s.fg_made || 0), fga: a.fga + (s.fg_attempted || 0),
    fg3m: a.fg3m + (s.fg3_made || 0), fg3a: a.fg3a + (s.fg3_attempted || 0),
    ftm: a.ftm + (s.ft_made || 0), fta: a.fta + (s.ft_attempted || 0),
  }), { pts:0,reb:0,ast:0,stl:0,blk:0,to:0,fgm:0,fga:0,fg3m:0,fg3a:0,ftm:0,fta:0 });

  const gp = stats.length;
  const avg = (n: number) => Math.round((n / gp) * 10) / 10;
  const pct = (m: number, a: number) => a === 0 ? 0 : Math.round((m / a) * 1000) / 10;
  const tsd = 2 * (tot.fga + 0.44 * tot.fta);

  const gameLog = stats.map(s => ({
    gameId: s.game_id,
    points: s.points, rebounds: s.rebounds, assists: s.assists,
    steals: s.steals, blocks: s.blocks, turnovers: s.turnovers,
    fgMade: s.fg_made, fgAttempted: s.fg_attempted,
    fg3Made: s.fg3_made, fg3Attempted: s.fg3_attempted,
    ftMade: s.ft_made, ftAttempted: s.ft_attempted,
    minutes: s.minutes,
    homeTeam: s.games?.home_team, awayTeam: s.games?.away_team,
    label: s.games?.home_team && s.games?.away_team
      ? `vs ${s.games.away_team === stats[0].team_abbr ? s.games.home_team : s.games.away_team}`
      : undefined,
  }));

  return cachedJson({
    success: true,
    playerName: stats[0].player_name,
    teamAbbr: stats[0].team_abbr,
    playerId: params.id,
    averages: {
      gp, pts: avg(tot.pts), reb: avg(tot.reb), ast: avg(tot.ast),
      stl: avg(tot.stl), blk: avg(tot.blk), to: avg(tot.to),
      fgPct: pct(tot.fgm, tot.fga), fg3Pct: pct(tot.fg3m, tot.fg3a),
      ftPct: pct(tot.ftm, tot.fta),
      tsPct: tsd === 0 ? 0 : Math.round((tot.pts / tsd) * 1000) / 10,
      effFg: tot.fga === 0 ? 0 : Math.round(((tot.fgm + 0.5 * tot.fg3m) / tot.fga) * 1000) / 10,
    },
    gameLog,
  });
}
