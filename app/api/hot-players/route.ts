import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getVerdictContext } from '@/lib/analytics/game-verdict';

// Cache helper — s-maxage=60s, stale-while-revalidate=120s
function cachedJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}

// ── Context weighting ─────────────────────────────────────────
// Tension games (close margin) → full weight
// Notable games (high-scoring) → partial weight
// Settled games (blowouts)     → down-weighted
// Unclassified / in-progress   → neutral weight
const WEIGHTS = {
  tension:  1.0,
  notable:  0.7,
  settled:  0.5,
  neutral:  1.0,   // scheduled / live / unclassified — no penalty
} as const;

function getWeight(gameStatus: string | null, homeScore: number, awayScore: number): number {
  if (!gameStatus || gameStatus !== 'final') return WEIGHTS.neutral;
  if (homeScore + awayScore === 0) return WEIGHTS.neutral;

  const ctx = getVerdictContext(homeScore, awayScore, gameStatus);
  if (!ctx) return WEIGHTS.neutral;

  if (ctx.short === 'Wire' || ctx.short === 'Tight') return WEIGHTS.tension;
  if (ctx.short === 'High')                          return WEIGHTS.notable;
  return WEIGHTS.settled;  // Solid, Comfort, Blowout
}

function weightedMean(vals: number[], weights: number[]): number {
  const totalW = weights.reduce((a, b) => a + b, 0);
  if (totalW === 0) return 0;
  return vals.reduce((a, v, i) => a + v * weights[i], 0) / totalW;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function GET() {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();

  const { data: stats, error } = await supabase
    .from('player_stats')
    .select(`
      player_id, player_name, team_abbr,
      points, rebounds, assists, last_updated,
      games(home_score, away_score, status)
    `)
    .gte('last_updated', since)
    .order('last_updated', { ascending: true }); // chronological for sparkline

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  const map = new Map<string, any>();
  for (const s of stats || []) {
    if (!map.has(s.player_id)) {
      map.set(s.player_id, {
        playerId:   s.player_id,
        playerName: s.player_name,
        teamAbbr:   s.team_abbr,
        logs: [],
      });
    }
    map.get(s.player_id).logs.push({
      pts:        s.points,
      reb:        s.rebounds,
      ast:        s.assists,
      gameStatus: (s.games as any)?.status    ?? null,
      homeScore:  (s.games as any)?.home_score ?? 0,
      awayScore:  (s.games as any)?.away_score ?? 0,
    });
  }

  const players = Array.from(map.values())
    .filter(p => p.logs.length >= 2)
    .map(p => {
      const gp  = p.logs.length;
      const pts = p.logs.map((g: any) => g.pts);
      const reb = p.logs.map((g: any) => g.reb);
      const ast = p.logs.map((g: any) => g.ast);

      // Per-game context weights
      const weights = p.logs.map((g: any) =>
        getWeight(g.gameStatus, g.homeScore, g.awayScore)
      );

      // Raw averages — unweighted, still used for display comparison
      const avgPts = round1(pts.reduce((a: number, b: number) => a + b, 0) / gp);
      const avgReb = round1(reb.reduce((a: number, b: number) => a + b, 0) / gp);
      const avgAst = round1(ast.reduce((a: number, b: number) => a + b, 0) / gp);

      // Context-weighted averages — used for ranking and primary display
      const ctxAvgPts = round1(weightedMean(pts, weights));
      const ctxAvgReb = round1(weightedMean(reb, weights));
      const ctxAvgAst = round1(weightedMean(ast, weights));

      // Show raw average as secondary context only when:
      //   (a) difference is ≥ 1 point AND
      //   (b) difference is ≥ 5% of raw average
      // This scales correctly across high and low scorers.
      const ptsDiff    = Math.abs(ctxAvgPts - avgPts);
      const ptsDiffPct = avgPts > 0 ? (ptsDiff / avgPts) * 100 : 0;
      const showRawPts = ptsDiff >= 1.0 && ptsDiffPct >= 5;

      // Sparkline: last 6 entries with context attached
      const recentLogs = p.logs.slice(-6);
      const sparkline  = recentLogs.map((g: any) => ({
        pts:        g.pts,
        gameStatus: g.gameStatus,
        homeScore:  g.homeScore,
        awayScore:  g.awayScore,
      }));

      // Trend: chronological % change across sparkline pts
      const ptsOnly = sparkline.map((g: any) => g.pts);
      const oldest  = ptsOnly[0];
      const newest  = ptsOnly[ptsOnly.length - 1];
      const trend   = gp >= 2 && oldest > 0
        ? round1(((newest - oldest) / oldest) * 100)
        : 0;

      return {
        playerId:   p.playerId,
        playerName: p.playerName,
        teamAbbr:   p.teamAbbr,

        // Raw averages — for display when showRawPts is true
        avgPts, avgReb, avgAst,

        // Context-weighted — primary sort key and displayed stat
        ctxAvgPts, ctxAvgReb, ctxAvgAst,

        // Whether to surface the raw vs context difference
        showRawPts,

        gp,
        trend,
        sparkline,
      };
    })
    // Sort by context-weighted points — this is the ranking that reflects meaning
    .sort((a, b) => b.ctxAvgPts - a.ctxAvgPts)
    .slice(0, 25);

  return cachedJson({ success: true, players });
}
