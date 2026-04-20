import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

type HealthStatus = 'healthy' | 'degraded' | 'down';

// ── Thresholds ────────────────────────────────────────────────
const STALE_GAME_MS    = 10 * 60 * 1000;  // 10m — game data is stale
const DEAD_GAME_MS     = 30 * 60 * 1000;  // 30m — game data is dead
const STALE_PLAYER_MS  = 60 * 60 * 1000;  // 1h  — player stats stale

export async function GET() {
  const now = Date.now();

  // ── 1. DB connectivity ───────────────────────────────────
  let dbStatus: HealthStatus = 'healthy';
  let gameCount              = 0;
  let playerStatCount        = 0;
  let lastGameUpdate: string | null = null;
  let lastPlayerUpdate: string | null = null;
  let gameAgeMs              = 0;
  let playerAgeMs            = 0;

  try {
    // Game count + most recent update
    const { data: games, error: gErr } = await supabase
      .from('games')
      .select('id, last_updated, status')
      .order('last_updated', { ascending: false })
      .limit(1);

    if (gErr) throw gErr;

    // Total game count (lightweight)
    const { count } = await supabase
      .from('games')
      .select('id', { count: 'exact', head: true });

    gameCount = count ?? 0;

    if (games && games.length > 0) {
      lastGameUpdate = games[0].last_updated as string;
      gameAgeMs      = now - new Date(lastGameUpdate as string).getTime();
    }

    // Player stats — most recent update
    const { data: ps, error: psErr } = await supabase
      .from('player_stats')
      .select('id, last_updated')
      .order('last_updated', { ascending: false })
      .limit(1);

    if (!psErr && ps && ps.length > 0) {
      lastPlayerUpdate = ps[0].last_updated as string;
      playerAgeMs      = now - new Date(lastPlayerUpdate as string).getTime();

      const { count: psCount } = await supabase
        .from('player_stats')
        .select('id', { count: 'exact', head: true });
      playerStatCount = psCount ?? 0;
    }
  } catch {
    dbStatus = 'down';
  }

  // ── 2. Live game check ───────────────────────────────────
  let liveGameStatus: HealthStatus = 'healthy';
  let hasLiveGames                 = false;

  if (dbStatus !== 'down') {
    try {
      const { data: live } = await supabase
        .from('games')
        .select('id')
        .eq('status', 'in_progress')
        .limit(1);

      hasLiveGames = (live ?? []).length > 0;

      // Only flag staleness if there are live games
      if (hasLiveGames && gameAgeMs > DEAD_GAME_MS)   liveGameStatus = 'down';
      else if (hasLiveGames && gameAgeMs > STALE_GAME_MS) liveGameStatus = 'degraded';
    } catch {
      liveGameStatus = 'degraded';
    }
  }

  // ── 3. Player stats freshness ────────────────────────────
  let playerStatus: HealthStatus = 'healthy';
  if (dbStatus !== 'down' && playerStatCount > 0) {
    if (playerAgeMs > STALE_PLAYER_MS) playerStatus = 'degraded';
  }

  // ── 4. Overall status ────────────────────────────────────
  const overall: HealthStatus =
    dbStatus === 'down'                                  ? 'down'
    : liveGameStatus === 'down'                          ? 'down'
    : liveGameStatus === 'degraded' || playerStatus === 'degraded' ? 'degraded'
    : 'healthy';

  const body = {
    status:    overall,
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status:    dbStatus,
        gameCount,
        playerStatCount,
      },
      dataFreshness: {
        status:          liveGameStatus,
        hasLiveGames,
        lastGameUpdate,
        gameAgeMs:       gameAgeMs > 0 ? gameAgeMs : null,
        lastPlayerUpdate,
        playerAgeMs:     playerAgeMs > 0 ? playerAgeMs : null,
      },
      playerStats: {
        status: playerStatus,
      },
    },
  };

  // HTTP status reflects overall health so monitors can gate on it
  const httpStatus = overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503;

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      // Never cache — monitors need fresh data every poll
      'Cache-Control': 'no-store',
    },
  });
}
