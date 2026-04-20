import { NextResponse } from 'next/server';
import { fetchPlayerSeasonStats } from '@/lib/api/nba-season';

// 1-hour cache — season averages change at most once per day
function seasonJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const stats = await fetchPlayerSeasonStats(params.id);

  if (!stats) {
    return NextResponse.json(
      { success: false, error: 'Season stats unavailable' },
      { status: 404 },
    );
  }

  return seasonJson({ success: true, season: stats });
}
