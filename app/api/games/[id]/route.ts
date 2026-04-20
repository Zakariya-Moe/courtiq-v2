import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

// Cache helper — s-maxage=30s, stale-while-revalidate=60s
function cachedJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
}



export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [{ data: game, error }, { data: players }] = await Promise.all([
    supabase.from('games').select('*').eq('id', params.id).single(),
    supabase.from('player_stats').select('*').eq('game_id', params.id).order('points', { ascending: false }),
  ]);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 404 });
  return cachedJson({ success: true, game, players: players || [] });
}
