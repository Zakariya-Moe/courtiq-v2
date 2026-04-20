import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

function cachedJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  });
}

export async function GET() {
  // Try today first
  const { data: today, error } = await supabase
    .from('games')
    .select('*')
    .order('last_updated', { ascending: false });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  const games = today ?? [];

  // If no games at all (database empty or off-season), return empty cleanly
  if (games.length === 0) {
    return cachedJson({ success: true, games: [], empty: true });
  }

  // Separate today's games from older ones
  const todayStr = new Date().toISOString().split('T')[0];
  const todayGames = games.filter((g: any) => {
    const updated = new Date(g.last_updated);
    return updated.toISOString().split('T')[0] === todayStr;
  });

  // If today has games, return them — otherwise fall back to most recent batch
  return cachedJson({
    success: true,
    games:   todayGames.length > 0 ? todayGames : games,
    // Signal to client whether we're showing stale/yesterday data
    isToday: todayGames.length > 0,
  });
}
