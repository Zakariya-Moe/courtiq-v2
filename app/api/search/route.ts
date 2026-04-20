import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

// Cache helper — s-maxage=300s, stale-while-revalidate=600s
function cachedJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}



export type SearchResult = {
  playerId: string;
  playerName: string;
  teamAbbr: string;
  avgPts: number;
  gp: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';

  // Enforce minimum length server-side too
  if (q.length < 2) {
    return cachedJson({ results: [] });
  }

  // Pull matching rows from player_stats
  // We fetch more than we need so we can aggregate client-side in JS
  const { data, error } = await supabase
    .from('player_stats')
    .select('player_id, player_name, team_abbr, points')
    .ilike('player_name', `%${q}%`)
    .order('points', { ascending: false })
    .limit(200); // enough to aggregate across games

  if (error) {
    return NextResponse.json({ results: [] }, { status: 500 });
  }

  // Aggregate: one row per player_id, average points, game count
  const map = new Map<string, { playerName: string; teamAbbr: string; totalPts: number; gp: number }>();

  for (const row of data || []) {
    if (!map.has(row.player_id)) {
      map.set(row.player_id, {
        playerName: row.player_name,
        teamAbbr: row.team_abbr,
        totalPts: 0,
        gp: 0,
      });
    }
    const entry = map.get(row.player_id)!;
    entry.totalPts += row.points || 0;
    entry.gp += 1;
  }

  const results: SearchResult[] = Array.from(map.entries())
    .map(([playerId, v]) => ({
      playerId,
      playerName: v.playerName,
      teamAbbr: v.teamAbbr,
      avgPts: v.gp > 0 ? Math.round((v.totalPts / v.gp) * 10) / 10 : 0,
      gp: v.gp,
    }))
    .sort((a, b) => b.avgPts - a.avgPts) // highest scorers first
    .slice(0, 8);

  return NextResponse.json({ results });
}
