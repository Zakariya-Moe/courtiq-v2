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



export async function GET() {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: stats, error } = await supabase
    .from('player_stats')
    .select('player_id, player_name, team_abbr, points, rebounds, assists, last_updated')
    .gte('last_updated', since)
    .order('points', { ascending: false });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  const map = new Map<string, any>();
  for (const s of stats || []) {
    if (!map.has(s.player_id)) {
      map.set(s.player_id, { playerId: s.player_id, playerName: s.player_name, teamAbbr: s.team_abbr, logs: [] });
    }
    map.get(s.player_id).logs.push({ pts: s.points, reb: s.rebounds, ast: s.assists });
  }

  const players = Array.from(map.values())
    .filter(p => p.logs.length >= 1)
    .map(p => {
      const gp = p.logs.length;
      const avgPts = p.logs.reduce((a: number, g: any) => a + g.pts, 0) / gp;
      const avgReb = p.logs.reduce((a: number, g: any) => a + g.reb, 0) / gp;
      const avgAst = p.logs.reduce((a: number, g: any) => a + g.ast, 0) / gp;
      const sparkline: number[] = p.logs.map((g: any) => g.pts).slice(-6);
      const trend = gp >= 2 && sparkline[0] > 0
        ? Math.round(((sparkline[sparkline.length - 1] - sparkline[0]) / sparkline[0]) * 1000) / 10
        : 0;
      return {
        playerId: p.playerId, playerName: p.playerName, teamAbbr: p.teamAbbr,
        avgPts: Math.round(avgPts * 10) / 10,
        avgReb: Math.round(avgReb * 10) / 10,
        avgAst: Math.round(avgAst * 10) / 10,
        gp, trend, sparkline,
      };
    })
    .sort((a, b) => b.avgPts - a.avgPts)
    .slice(0, 25);

  return cachedJson({ success: true, players });
}
