// ─────────────────────────────────────────────────────────────
// PLAYER CONTEXT — cross-game pattern computation
//
// This is the central computation layer between raw game log data
// and the interpretation surfaces (player profile, signals engine,
// hot page). All pattern detection lives here so every surface
// gets consistent results from the same logic.
//
// Design principles:
//   - Only surface what we can defend from the data
//   - Suppress outputs below minimum sample thresholds
//   - Separate computation from display — callers decide how to render
//   - Context flows into signals, not the other way around
// ─────────────────────────────────────────────────────────────

import { getVerdictContext } from './game-verdict';

// ── Input shape — matches what the player API returns ─────────
export type GameLogEntry = {
  points:     number;
  rebounds:   number;
  assists:    number;
  fgMade:     number;
  fgAttempted: number;
  gameStatus:  string | null | undefined;
  homeScore:   number;
  awayScore:   number;
};

// ── Stat bucket — averages within a context category ─────────
export type ContextBucket = {
  gp:      number;
  avgPts:  number;
  avgReb:  number;
  avgAst:  number;
  fgPct:   number;   // shooting efficiency in this context
};

// ── Full player context output ────────────────────────────────
export type PlayerContext = {
  // Raw counts
  totalGames:    number;
  tensionGames:  number;
  settledGames:  number;
  notableGames:  number;     // high-scoring, pulling-away — excluded from split

  // Per-context performance (null when insufficient sample)
  tension:       ContextBucket | null;
  settled:       ContextBucket | null;

  // Derived signals — null when data doesn't support a claim
  clutchIndex:   number | null;  // tension pts / settled pts — >1 means better in close games
  clutchLabel:   string | null;  // human-readable interpretation
  contextDelta:  number | null;  // % difference in pts: tension vs settled
  splitLabel:    string | null;  // compact fraction: "4/6 tight" for scanning surfaces

  // Context-weighted game entries for the signals engine
  // Same shape as GeneratePlayerSignals input, but ordered by context weight:
  // tension games first (most meaningful), then settled, then notable
  contextWeightedGames: Array<{
    points:    number;
    rebounds:  number;
    assists:   number;
    weight:    number;  // 1.0 = tension, 0.7 = notable, 0.5 = settled
  }>;

  // Consistency within tension games (null if < 3 tension games)
  tensionConsistency: 'consistent' | 'volatile' | null;
};

// ── Thresholds ────────────────────────────────────────────────
const MIN_GAMES_FOR_SPLIT    = 5;   // minimum completed games to show any context
const MIN_GAMES_PER_BUCKET   = 2;   // minimum games in a bucket to report that bucket
const MIN_CLUTCH_INDEX_DELTA = 0.1; // |clutchIndex - 1| must exceed this to make a claim
const CONSISTENCY_CV_MAX     = 0.22; // coefficient of variation threshold for "consistent"

// ── Helpers ───────────────────────────────────────────────────
function avg(vals: number[]): number {
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function pct(made: number, attempted: number): number {
  return attempted > 0 ? Math.round((made / attempted) * 1000) / 10 : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function coefficientOfVariation(vals: number[]): number {
  if (vals.length < 2) return 0;
  const mean = avg(vals);
  if (mean === 0) return 0;
  const variance = vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / vals.length;
  return Math.sqrt(variance) / mean;
}

function buildBucket(entries: GameLogEntry[]): ContextBucket {
  return {
    gp:     entries.length,
    avgPts: round1(avg(entries.map(g => g.points))),
    avgReb: round1(avg(entries.map(g => g.rebounds))),
    avgAst: round1(avg(entries.map(g => g.assists))),
    fgPct:  pct(
      entries.reduce((a, g) => a + g.fgMade, 0),
      entries.reduce((a, g) => a + g.fgAttempted, 0),
    ),
  };
}

// ── Main export ───────────────────────────────────────────────
/**
 * computePlayerContext
 *
 * Takes the full game log from the player API and returns a
 * structured PlayerContext object. All surfaces that need
 * pattern data should call this rather than computing inline.
 *
 * @param gameLog  Array of game log entries (any order — sorted internally)
 */
export function computePlayerContext(gameLog: GameLogEntry[]): PlayerContext {
  // Only work with completed games that have score data
  const completed = gameLog.filter(
    g => g.gameStatus === 'final' && (g.homeScore + g.awayScore) > 0,
  );

  const tensionEntries: GameLogEntry[] = [];
  const settledEntries: GameLogEntry[] = [];
  const notableEntries: GameLogEntry[] = [];

  for (const g of completed) {
    const ctx = getVerdictContext(g.homeScore, g.awayScore, g.gameStatus ?? '');
    if (!ctx) continue;

    if (ctx.short === 'Wire' || ctx.short === 'Tight') {
      tensionEntries.push(g);
    } else if (ctx.short === 'Solid' || ctx.short === 'Comfort' || ctx.short === 'Blowout') {
      settledEntries.push(g);
    } else {
      // High-scoring / notable — tracked but excluded from split math
      notableEntries.push(g);
    }
  }

  const totalGames   = tensionEntries.length + settledEntries.length + notableEntries.length;
  const splitTotal   = tensionEntries.length + settledEntries.length;

  // ── Buckets — null below minimum sample ─────────────────────
  const tension = tensionEntries.length >= MIN_GAMES_PER_BUCKET
    ? buildBucket(tensionEntries)
    : null;

  const settled = settledEntries.length >= MIN_GAMES_PER_BUCKET
    ? buildBucket(settledEntries)
    : null;

  // ── Clutch index — only when both buckets have enough data ───
  let clutchIndex:  number | null = null;
  let clutchLabel:  string | null = null;
  let contextDelta: number | null = null;

  if (
    tension !== null &&
    settled !== null &&
    settled.avgPts > 0 &&
    totalGames >= MIN_GAMES_FOR_SPLIT
  ) {
    clutchIndex  = round1(tension.avgPts / settled.avgPts);
    contextDelta = round1(((tension.avgPts - settled.avgPts) / settled.avgPts) * 100);

    // Only make a claim when the difference is meaningful
    const delta = clutchIndex - 1;
    if (Math.abs(delta) >= MIN_CLUTCH_INDEX_DELTA) {
      if (delta > 0.25) {
        clutchLabel = 'Elevates in close games';
      } else if (delta > 0.10) {
        clutchLabel = 'Slightly better in tight games';
      } else if (delta < -0.25) {
        clutchLabel = 'Struggles in close games';
      } else {
        clutchLabel = 'Dips slightly in tight games';
      }
    }
    // If |delta| < MIN_CLUTCH_INDEX_DELTA, clutchLabel stays null —
    // no claim made, the difference isn't meaningful enough
  }

  // ── Split label — compact fraction for scanning surfaces ─────
  let splitLabel: string | null = null;
  if (tensionEntries.length > 0 && splitTotal >= 3) {
    splitLabel = `${tensionEntries.length}/${splitTotal} tight`;
  }

  // ── Tension consistency ───────────────────────────────────────
  let tensionConsistency: PlayerContext['tensionConsistency'] = null;
  if (tensionEntries.length >= 3) {
    const cv = coefficientOfVariation(tensionEntries.map(g => g.points));
    tensionConsistency = cv <= CONSISTENCY_CV_MAX ? 'consistent' : 'volatile';
  }

  // ── Context-weighted games for signals engine ─────────────────
  // Tension games carry full weight — they're the most meaningful signal.
  // Settled/notable are down-weighted so a run of blowout stats doesn't
  // trigger "hot streak" when the player was padding numbers.
  const contextWeightedGames = [
    ...tensionEntries.map(g => ({
      points:   g.points,
      rebounds: g.rebounds,
      assists:  g.assists,
      weight:   1.0,
    })),
    ...notableEntries.map(g => ({
      points:   g.points,
      rebounds: g.rebounds,
      assists:  g.assists,
      weight:   0.7,
    })),
    ...settledEntries.map(g => ({
      points:   g.points,
      rebounds: g.rebounds,
      assists:  g.assists,
      weight:   0.5,
    })),
  ];

  return {
    totalGames,
    tensionGames:  tensionEntries.length,
    settledGames:  settledEntries.length,
    notableGames:  notableEntries.length,
    tension,
    settled,
    clutchIndex,
    clutchLabel,
    contextDelta,
    splitLabel,
    contextWeightedGames,
    tensionConsistency,
  };
}

// ── Convenience: summary line for player profile ─────────────
/**
 * getPatternSummary
 *
 * Returns the two display values shown above the game log:
 * tension avg, settled avg, and the interpretation suffix.
 * Returns null when there isn't enough data to say anything.
 */
export type PatternSummary = {
  tensionAvgPts:  number;
  tensionGames:   number;
  settledAvgPts:  number;
  settledGames:   number;
  interpretation: string | null;  // "+29% in close games" or null
};

export function getPatternSummary(ctx: PlayerContext): PatternSummary | null {
  if (!ctx.tension || !ctx.settled) return null;
  if (ctx.totalGames < MIN_GAMES_FOR_SPLIT) return null;

  const diff   = ctx.tension.avgPts - ctx.settled.avgPts;
  const absDiff = Math.abs(diff);
  const pctDiff = ctx.settled.avgPts > 0
    ? Math.round((diff / ctx.settled.avgPts) * 100)
    : 0;

  // Only interpret when the difference is large enough to claim
  let interpretation: string | null = null;
  if (absDiff >= 1.5 && ctx.tension.gp >= 2 && ctx.settled.gp >= 2) {
    interpretation = diff > 0
      ? `+${pctDiff}% in close games`
      : `−${Math.abs(pctDiff)}% in close games`;
  }

  return {
    tensionAvgPts: ctx.tension.avgPts,
    tensionGames:  ctx.tension.gp,
    settledAvgPts: ctx.settled.avgPts,
    settledGames:  ctx.settled.gp,
    interpretation,
  };
}
