import { NextResponse } from 'next/server';
import { fetchAllTeamSeasonStats } from '@/lib/api/nba-team-season';

function seasonJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}

// GET /api/teams/season?abbr=LAL  — single team
// GET /api/teams/season            — all teams
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const abbr = searchParams.get('abbr')?.toUpperCase();

  const all = await fetchAllTeamSeasonStats();

  if (!all.length) {
    return NextResponse.json({ success: false, error: 'Season stats unavailable' }, { status: 503 });
  }

  if (abbr) {
    const team = all.find(t => t.teamAbbr.toUpperCase() === abbr);
    if (!team) {
      return NextResponse.json({ success: false, error: `Team ${abbr} not found` }, { status: 404 });
    }
    return seasonJson({ success: true, team });
  }

  return seasonJson({ success: true, teams: all });
}
