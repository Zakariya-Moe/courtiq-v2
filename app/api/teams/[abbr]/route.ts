import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

// Cache helper — s-maxage=120s, stale-while-revalidate=240s
function cachedJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
    },
  });
}



export type RosterPlayer = {
  playerId: string;
  playerName: string;
  avgPts: number;
  avgReb: number;
  avgAst: number;
  avgStl: number;
  avgBlk: number;
  fgPct: number;
  gp: number;
};

export type TeamStats = {
  teamAbbr: string;
  gp: number;           // unique games played (team level)
  avgPts: number;
  avgReb: number;
  avgAst: number;
  avgStl: number;
  avgBlk: number;
  fgPct: number;
};

export type TeamPageData = {
  teamAbbr: string;
  teamStats: TeamStats;
  roster: RosterPlayer[];       // sorted by avgPts desc
  topPerformers: RosterPlayer[]; // top 3
};

export async function GET(
  _req: Request,
  { params }: { params: { abbr: string } },
) {
  const abbr = params.abbr.toUpperCase();

  const { data, error } = await supabase
    .from('player_stats')
    .select(
      'player_id, player_name, points, rebounds, assists, steals, blocks, fg_made, fg_attempted, game_id',
    )
    .eq('team_abbr', abbr)
    .order('points', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
  }

  // ── Aggregate per player ─────────────────────────────────
  const playerMap = new Map<string, {
    name: string;
    totPts: number; totReb: number; totAst: number;
    totStl: number; totBlk: number;
    totFgm: number; totFga: number;
    gp: number;
  }>();

  const teamGameIds = new Set<string>();

  for (const row of data) {
    teamGameIds.add(row.game_id);
    if (!playerMap.has(row.player_id)) {
      playerMap.set(row.player_id, {
        name: row.player_name,
        totPts: 0, totReb: 0, totAst: 0,
        totStl: 0, totBlk: 0,
        totFgm: 0, totFga: 0,
        gp: 0,
      });
    }
    const p = playerMap.get(row.player_id)!;
    p.totPts += row.points    || 0;
    p.totReb += row.rebounds  || 0;
    p.totAst += row.assists   || 0;
    p.totStl += row.steals    || 0;
    p.totBlk += row.blocks    || 0;
    p.totFgm += row.fg_made   || 0;
    p.totFga += row.fg_attempted || 0;
    p.gp     += 1;
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const pct    = (m: number, a: number) =>
    a === 0 ? 0 : Math.round((m / a) * 1000) / 10;

  // ── Build roster (sorted by avgPts desc) ─────────────────
  const roster: RosterPlayer[] = Array.from(playerMap.entries())
    .map(([playerId, v]) => ({
      playerId,
      playerName: v.name,
      avgPts: round1(v.totPts / v.gp),
      avgReb: round1(v.totReb / v.gp),
      avgAst: round1(v.totAst / v.gp),
      avgStl: round1(v.totStl / v.gp),
      avgBlk: round1(v.totBlk / v.gp),
      fgPct:  pct(v.totFgm, v.totFga),
      gp:     v.gp,
    }))
    .sort((a, b) => b.avgPts - a.avgPts);

  // ── Team-level aggregates ─────────────────────────────────
  // Use unique game count as team GP (not sum of all player rows)
  const teamGp = teamGameIds.size;

  // Sum team totals from the raw rows directly
  let tPts = 0, tReb = 0, tAst = 0, tStl = 0, tBlk = 0, tFgm = 0, tFga = 0;
  for (const row of data) {
    tPts += row.points       || 0;
    tReb += row.rebounds     || 0;
    tAst += row.assists      || 0;
    tStl += row.steals       || 0;
    tBlk += row.blocks       || 0;
    tFgm += row.fg_made      || 0;
    tFga += row.fg_attempted || 0;
  }

  const teamStats: TeamStats = {
    teamAbbr: abbr,
    gp:      teamGp,
    avgPts:  round1(tPts / teamGp),
    avgReb:  round1(tReb / teamGp),
    avgAst:  round1(tAst / teamGp),
    avgStl:  round1(tStl / teamGp),
    avgBlk:  round1(tBlk / teamGp),
    fgPct:   pct(tFgm, tFga),
  };

  return cachedJson({
    success: true,
    teamAbbr: abbr,
    teamStats,
    roster,
    topPerformers: roster.slice(0, 3),
  } satisfies { success: true } & TeamPageData);
}
