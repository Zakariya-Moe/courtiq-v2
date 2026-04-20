import { NextResponse } from 'next/server';
import { fetchNBAGames } from '@/lib/api/nba';
import { fetchBoxScore } from '@/lib/api/nba-boxscore';
import { upsertGames } from '@/lib/db/games';
import { upsertPlayerStats } from '@/lib/db/player-stats';

export async function GET() {
  const start  = Date.now();

  // 1. Fetch today's games
  const games = await fetchNBAGames();
  if (!games.length) {
    return NextResponse.json({
      success: false,
      message: 'No games returned from balldontlie. Check BALLDONTLIE_API_KEY env var.',
      elapsedMs: Date.now() - start,
    });
  }

  await upsertGames(games);

  // 2. Try fetching box score for first game (verifies player-stat tier)
  const firstId  = games[0].id;
  let playerStats = await fetchBoxScore(firstId);
  if (playerStats.length) await upsertPlayerStats(playerStats);

  return NextResponse.json({
    success: true,
    games: games.length,
    sampleGame: games[0],
    playerStatsSample: playerStats.slice(0, 3),
    playerStatsTotal: playerStats.length,
    tierNote: playerStats.length === 0
      ? 'Player stats unavailable — upgrade balldontlie to ALL-STAR ($9.99/mo) for box scores'
      : 'Player stats OK',
    elapsedMs: Date.now() - start,
  });
}
