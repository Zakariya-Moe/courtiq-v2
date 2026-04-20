import { NextResponse } from 'next/server';
import { fetchNBAGames } from '@/lib/api/nba';
import { fetchBoxScore, fetchLiveBoxScores, type PlayerStat } from '@/lib/api/nba-boxscore';
import { upsertGames } from '@/lib/db/games';
import { upsertPlayerStats } from '@/lib/db/player-stats';
import { supabase } from '@/lib/db/client';

const CONCURRENCY = 3;
const FINALIZE_MS = 20 * 60 * 1000; // 20 min after final before marking stats_finalized

// ── How long after a game ends we keep polling it ────────────
// After FINALIZE_MS the game is marked stats_finalized and we stop.
// Between game_end and FINALIZE_MS we poll every 15 min to catch
// any late stat corrections.

async function batchFetch(ids: string[]): Promise<PlayerStat[]> {
  const out: PlayerStat[] = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const results = await Promise.all(
      ids.slice(i, i + CONCURRENCY).map(async id => {
        try { return await fetchBoxScore(id); } catch { return []; }
      }),
    );
    out.push(...results.flat());
  }
  return out;
}

export async function GET(req: Request) {
  // ── Auth ─────────────────────────────────────────────────────
  // Vercel's cron runner sends x-vercel-signature but no Authorization
  // header. We allow that, plus explicit Bearer for manual triggers.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get('authorization');
    const vercelSig  = req.headers.get('x-vercel-signature');
    const hasValidBearer = authHeader === `Bearer ${secret}`;
    const isVercelCron   = !authHeader && !!vercelSig;
    if (!hasValidBearer && !isVercelCron) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const start = Date.now();

  // ── FAST PATH: check DB for active games before hitting external API ──
  // The cron now runs every 15 minutes. On quiet nights (no live games,
  // no unfinalized games) this early-exit fires in ~100ms and costs
  // essentially nothing.
  const { data: activeCheck } = await supabase
    .from('games')
    .select('id, status, stats_finalized, last_updated')
    .or('status.eq.in_progress,and(status.eq.final,stats_finalized.eq.false)')
    .limit(1);

  const hasActiveGames = (activeCheck ?? []).length > 0;

  // Also check if today has any games at all (covers pre-tipoff hours)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: todayCount } = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .gte('last_updated', todayStart.toISOString());

  const hasTodayGames = (todayCount ?? 0) > 0;

  // Early exit: no live/unfinalized games and today already ingested
  // This covers the ~18 hours per day when games aren't happening.
  if (!hasActiveGames && hasTodayGames) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason:  'No active games — all stats finalized for today',
      elapsedMs: Date.now() - start,
    });
  }

  // ── 1. Sync today's game schedule from balldontlie ────────────
  const games = await fetchNBAGames();
  await upsertGames(games);

  // ── 2. Find games that need stat ingestion ───────────────────
  const { data: active } = await supabase
    .from('games')
    .select('id, status, last_updated, stats_finalized')
    .or('status.eq.in_progress,and(status.eq.final,stats_finalized.eq.false)');

  const liveIds  = (active ?? []).filter((g: any) => g.status === 'in_progress').map((g: any) => g.id);
  const finalIds = (active ?? []).filter((g: any) => g.status === 'final' && !g.stats_finalized).map((g: any) => g.id);

  // ── 3. Ingest player stats ───────────────────────────────────
  // GOAT tier: live box scores endpoint (all live games in one call)
  // ALL-STAR tier: per-game /v1/stats (falls back gracefully)
  let stats: PlayerStat[] = [];

  if (liveIds.length > 0) {
    stats = await fetchLiveBoxScores();
    if (stats.length === 0) {
      // Tier too low for live endpoint — fall back to per-game
      stats = await batchFetch([...liveIds, ...finalIds]);
    }
  } else if (finalIds.length > 0) {
    stats = await batchFetch(finalIds);
  }

  if (stats.length) await upsertPlayerStats(stats);

  // ── 4. Mark finalized games ──────────────────────────────────
  const now = Date.now();
  const toFinalize = (active ?? [])
    .filter((g: any) =>
      g.status === 'final' &&
      !g.stats_finalized &&
      now - new Date(g.last_updated as string).getTime() >= FINALIZE_MS,
    )
    .map((g: any) => g.id);

  if (toFinalize.length) {
    await supabase.from('games').update({ stats_finalized: true }).in('id', toFinalize);
  }

  return NextResponse.json({
    success:    true,
    skipped:    false,
    games:      games.length,
    stats:      stats.length,
    liveIds,
    finalIds,
    finalized:  toFinalize.length,
    elapsedMs:  Date.now() - start,
  });
}
