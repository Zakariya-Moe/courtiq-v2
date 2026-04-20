// ─────────────────────────────────────────────────────────────
// GAME VERDICT — shared across all surfaces
//
// Three-state color system:
//   TENSION  (green)  — close margin, outcome uncertain
//   NOTABLE  (amber)  — something unusual: high-scoring, live pull-away
//   SETTLED  (white)  — decided, lower urgency
//
// Import getGameVerdict wherever game context needs to travel
// with a stat — game log rows, player cards, feed items, etc.
// ─────────────────────────────────────────────────────────────

export type VerdictState = 'tension' | 'notable' | 'settled';

export type GameVerdict = {
  emoji:  string;
  label:  string;          // full label — "Down to the wire"
  short:  string;          // compact label — "Wire" / "Tight" / "Blowout"
  state:  VerdictState;
  color:  string;          // CSS color value
  bg:     string;          // tinted background
  border: string;          // tinted border
};

// ── Canonical color tokens — change here, updates everywhere ──
export const VERDICT_COLORS: Record<VerdictState, { color: string; bg: string; border: string }> = {
  tension: {
    color:  'var(--green)',
    bg:     'rgba(0,200,5,0.09)',
    border: 'rgba(0,200,5,0.22)',
  },
  notable: {
    color:  'var(--amber)',
    bg:     'rgba(255,159,10,0.09)',
    border: 'rgba(255,159,10,0.22)',
  },
  settled: {
    color:  'rgba(255,255,255,0.35)',
    bg:     'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
  },
};

/**
 * getGameVerdict
 *
 * Derives game context from score data alone — no play-by-play needed.
 * Returns null for scheduled/postponed games where no story exists yet.
 *
 * @param homeScore  Home team score
 * @param awayScore  Away team score
 * @param status     'in_progress' | 'final' | 'scheduled' | 'postponed'
 */
export function getGameVerdict(
  homeScore: number,
  awayScore: number,
  status: string,
): GameVerdict | null {
  if (status !== 'in_progress' && status !== 'final') return null;

  const total  = homeScore + awayScore;
  const margin = Math.abs(homeScore - awayScore);
  const isLive = status === 'in_progress';

  if (total === 0) return null; // game hasn't started

  // Notable: high-scoring — unusual regardless of margin
  if (total >= 240) {
    return {
      emoji: '🚀', label: 'High-scoring game', short: 'High',
      state: 'notable', ...VERDICT_COLORS.notable,
    };
  }

  // Tension: close margin — outcome genuinely uncertain
  if (margin <= 3) {
    return {
      emoji: '🔥',
      label:  isLive ? 'Too close to call' : 'Down to the wire',
      short:  isLive ? 'Close'             : 'Wire',
      state: 'tension', ...VERDICT_COLORS.tension,
    };
  }
  if (margin <= 7) {
    return {
      emoji: '⚡',
      label:  isLive ? 'Tight game'  : 'Close finish',
      short:  'Tight',
      state: 'tension', ...VERDICT_COLORS.tension,
    };
  }

  // Notable: live game where lead is building — some drama remains
  if (isLive && margin <= 18) {
    return {
      emoji: '📈', label: 'Pulling away', short: 'Away',
      state: 'notable', ...VERDICT_COLORS.notable,
    };
  }

  // Settled: comfortable wins — decided, come back for the box score
  if (margin <= 14) {
    return {
      emoji: '✅',
      label:  isLive ? 'In control'  : 'Solid win',
      short:  isLive ? 'Ahead'       : 'Solid',
      state: 'settled', ...VERDICT_COLORS.settled,
    };
  }
  if (margin <= 24) {
    return {
      emoji: '💪',
      label:  isLive ? 'In control'     : 'Comfortable win',
      short:  isLive ? 'Ahead'          : 'Comfort',
      state: 'settled', ...VERDICT_COLORS.settled,
    };
  }

  // Dominant
  return {
    emoji: '🏆',
    label:  isLive ? 'Running away' : 'Dominant win',
    short:  'Blowout',
    state: 'settled', ...VERDICT_COLORS.settled,
  };
}

/**
 * getVerdictShortLabel
 * Convenience helper for compact surfaces like game log rows.
 * Returns the short label, or null if no verdict.
 */
export function getVerdictContext(
  homeScore: number,
  awayScore: number,
  status: string,
): { short: string; color: string } | null {
  const v = getGameVerdict(homeScore, awayScore, status);
  if (!v) return null;
  return { short: v.short, color: v.color };
}
