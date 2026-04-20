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



export async function GET() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('last_updated', { ascending: false });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return cachedJson({ success: true, games: data || [] });
}
