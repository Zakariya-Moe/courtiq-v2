import { NextResponse } from 'next/server';
import { fetchNBAGames } from '@/lib/api/nba';
import { fetchBoxScore, type PlayerStat } from '@/lib/api/nba-boxscore';
import { upsertGames } from '@/lib/db/games';
import { upsertPlayerStats } from '@/lib/db/player-stats';
import { supabase } from '@/lib/db/client';

const CONCURRENCY = 3;
const FINALIZE_MS = 20 * 60 * 1000;

async function batchFetch(ids: string[]): Promise<PlayerStat[]> {
  const out: PlayerStat[] = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const results = await Promise.all(
      ids.slice(i, i + CONCURRENCY).map(async id => {
        try { return await fetchBoxScore(id); } catch { return []; }
      })
    );
    out.push(...results.flat());
  }
  return out;
}

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response('Unauthorized', { status: 401 });

  const start = Date.now();
  const games = await fetchNBAGames();
  await upsertGames(games);

  const { data: active } = await supabase
    .from('games').select('id, status, last_updated, stats_finalized')
    .or('status.eq.in_progress,and(status.eq.final,stats_finalized.eq.false)');

  const ids = (active || []).map((g: any) => g.id);
  const stats = await batchFetch(ids);
  if (stats.length) await upsertPlayerStats(stats);

  const now = Date.now();
  const toFinalize = (active || [])
    .filter((g: any) => g.status === 'final' && !g.stats_finalized && now - new Date(g.last_updated as string).getTime() >= FINALIZE_MS)
    .map((g: any) => g.id);
  if (toFinalize.length)
    await supabase.from('games').update({ stats_finalized: true }).in('id', toFinalize);

  return NextResponse.json({ success: true, games: games.length, stats: stats.length, elapsedMs: Date.now() - start });
}
