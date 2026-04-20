// ─────────────────────────────────────────────────────────────
// FRESHNESS SYSTEM
// Pure functions. No side effects. No imports.
// Staleness is only meaningful when live games exist.
// ─────────────────────────────────────────────────────────────

export type FreshnessLevel = 'fresh' | 'delay' | 'stale' | 'dead';

export type FreshnessState = {
  level: FreshnessLevel;
  ageMs: number;
  ageLabel: string;       // e.g. "just now", "2m ago", "12m ago"
  hasLiveGames: boolean;
  shouldWarn: boolean;    // false when no live games — suppress all warnings
};

// Thresholds in milliseconds
const T = {
  fresh: 90_000,    //  < 90s  → fresh (no label)
  delay: 300_000,   //  < 5m   → slight delay (timestamp only)
  stale: 900_000,   //  < 15m  → stale (explicit label)
  // ≥ 15m           →   dead
};

export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed' | string;

export type GameRow = {
  status: string;
  last_updated: string; // ISO timestamp
};

/**
 * hasAnyLiveGames
 * Returns true if at least one game is actively in progress.
 */
export function hasAnyLiveGames(games: GameRow[]): boolean {
  return games.some(g => g.status === 'in_progress');
}

/**
 * getMostRecentUpdate
 * Returns the most recent last_updated timestamp across all games.
 * Only considers in_progress games when live games exist,
 * falls back to all games otherwise.
 */
export function getMostRecentUpdate(games: GameRow[]): number {
  if (!games.length) return 0;
  const liveGames = games.filter(g => g.status === 'in_progress');
  const source    = liveGames.length > 0 ? liveGames : games;
  return Math.max(...source.map(g => new Date(g.last_updated).getTime()));
}

/**
 * getFreshnessLevel
 * Maps age in ms to a freshness level.
 */
export function getFreshnessLevel(ageMs: number): FreshnessLevel {
  if (ageMs < T.fresh) return 'fresh';
  if (ageMs < T.delay) return 'delay';
  if (ageMs < T.stale) return 'stale';
  return 'dead';
}

/**
 * formatAge
 * Human-readable relative time label.
 */
export function formatAge(ageMs: number): string {
  const s = Math.floor(ageMs / 1000);
  if (s < 10)  return 'just now';
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

/**
 * computeFreshness
 * Main entry point. Returns a complete FreshnessState.
 *
 * Key rule: shouldWarn is false when no live games exist —
 * callers must check this before showing any warning UI.
 */
export function computeFreshness(games: GameRow[], now: number = Date.now()): FreshnessState {
  const live    = hasAnyLiveGames(games);
  const lastMs  = getMostRecentUpdate(games);
  const ageMs   = lastMs > 0 ? Math.max(0, now - lastMs) : 0;
  const level   = lastMs > 0 ? getFreshnessLevel(ageMs) : 'fresh';

  return {
    level,
    ageMs,
    ageLabel: lastMs > 0 ? formatAge(ageMs) : '',
    hasLiveGames: live,
    // Only warn if there are live games AND data is not fresh
    shouldWarn: live && level !== 'fresh',
  };
}

/**
 * freshnessColors
 * Returns CSS color tokens for a given level.
 */
export function freshnessColors(level: FreshnessLevel): {
  dot: string;
  text: string;
  bg: string;
  border: string;
} {
  switch (level) {
    case 'fresh':
      return { dot: '#00C805', text: '#00C805', bg: 'rgba(0,200,5,0.10)', border: 'rgba(0,200,5,0.20)' };
    case 'delay':
      return { dot: '#FFD60A', text: '#FFD60A', bg: 'rgba(255,214,10,0.10)', border: 'rgba(255,214,10,0.20)' };
    case 'stale':
      return { dot: '#FF9F0A', text: '#FF9F0A', bg: 'rgba(255,159,10,0.10)', border: 'rgba(255,159,10,0.20)' };
    case 'dead':
      return { dot: '#FF3B30', text: '#FF3B30', bg: 'rgba(255,59,48,0.10)', border: 'rgba(255,59,48,0.20)' };
  }
}
