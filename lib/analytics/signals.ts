// ─────────────────────────────────────────────────────────────
// COURTIQ SIGNALS SYSTEM
// Deterministic, lightweight. No randomness. No external calls.
// ─────────────────────────────────────────────────────────────

export type SignalType = 'hot' | 'cold' | 'breakout' | 'consistent' | 'declining';

export type Signal = {
  type: SignalType;
  label: string;
  description: string;
  confidence: number; // 0–100
  stat: 'pts' | 'reb' | 'ast';
};

export type GameEntry = {
  points: number;
  rebounds: number;
  assists: number;
};

// ─── THRESHOLDS ───────────────────────────────────────────────
const HOT_THRESHOLD        = 0.15;  // 15% above average = hot
const COLD_THRESHOLD       = -0.15; // 15% below average = cold
const BREAKOUT_THRESHOLD   = 0.35;  // 35% above average = breakout
const DECLINING_THRESHOLD  = -0.25; // 25% below recent = declining
const CONSISTENT_CV_MAX    = 0.18;  // coefficient of variation <= 18%
const MIN_GAMES_FOR_SIGNAL = 2;     // need at least 2 games

// ─── HELPERS ──────────────────────────────────────────────────
function mean(vals: number[]): number {
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function stdDev(vals: number[], avg: number): number {
  if (vals.length < 2) return 0;
  const variance = vals.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / vals.length;
  return Math.sqrt(variance);
}

function delta(recent: number, baseline: number): number {
  if (baseline === 0) return 0;
  return (recent - baseline) / baseline;
}

// Map delta to 0–100 confidence, clamped
function confidence(d: number, threshold: number): number {
  const ratio = Math.abs(d) / Math.abs(threshold);
  return Math.min(Math.round(ratio * 70 + 30), 100);
}

// ─── CORE FUNCTION ────────────────────────────────────────────
/**
 * generatePlayerSignals
 *
 * @param recentGames  Last N games (most recent first)
 * @param seasonAvg    Season averages { pts, reb, ast } — optional
 * @param currentGame  Stats from the current live game — optional
 */
export function generatePlayerSignals(
  recentGames: GameEntry[],
  seasonAvg?: { pts: number; reb: number; ast: number },
  currentGame?: GameEntry,
): Signal[] {
  if (!recentGames || recentGames.length < MIN_GAMES_FOR_SIGNAL) return [];

  const signals: Signal[] = [];

  // Use last 3–5 games for recency window
  const window = recentGames.slice(0, Math.min(5, recentGames.length));

  const recentPts  = window.map(g => g.points);
  const recentReb  = window.map(g => g.rebounds);
  const recentAst  = window.map(g => g.assists);

  const avgPts = mean(recentPts);
  const avgReb = mean(recentReb);
  const avgAst = mean(recentAst);

  // Baseline: prefer season avg, fall back to recent avg
  const basePts = seasonAvg?.pts ?? avgPts;
  const baseReb = seasonAvg?.reb ?? avgReb;
  const baseAst = seasonAvg?.ast ?? avgAst;

  // ── 1. BREAKOUT GAME (requires currentGame) ──────────────
  if (currentGame) {
    const ptsDelta = delta(currentGame.points, basePts);
    const rebDelta = delta(currentGame.rebounds, baseReb);
    const astDelta = delta(currentGame.assists, baseAst);

    if (ptsDelta >= BREAKOUT_THRESHOLD && currentGame.points >= 20) {
      signals.push({
        type: 'breakout',
        label: '🚀 Breakout',
        description: `${currentGame.points} PTS — ${Math.round(ptsDelta * 100)}% above average`,
        confidence: confidence(ptsDelta, BREAKOUT_THRESHOLD),
        stat: 'pts',
      });
    } else if (rebDelta >= BREAKOUT_THRESHOLD && currentGame.rebounds >= 12) {
      signals.push({
        type: 'breakout',
        label: '🚀 Breakout',
        description: `${currentGame.rebounds} REB — ${Math.round(rebDelta * 100)}% above average`,
        confidence: confidence(rebDelta, BREAKOUT_THRESHOLD),
        stat: 'reb',
      });
    } else if (astDelta >= BREAKOUT_THRESHOLD && currentGame.assists >= 10) {
      signals.push({
        type: 'breakout',
        label: '🚀 Breakout',
        description: `${currentGame.assists} AST — ${Math.round(astDelta * 100)}% above average`,
        confidence: confidence(astDelta, BREAKOUT_THRESHOLD),
        stat: 'ast',
      });
    }
  }

  // ── 2. HOT STREAK (recent window vs baseline) ─────────────
  const ptsTrend  = delta(avgPts, basePts);
  const rebTrend  = delta(avgReb, baseReb);
  const astTrend  = delta(avgAst, baseAst);

  // Determine dominant hot stat
  const hotStats = [
    { stat: 'pts' as const, d: ptsTrend, avg: avgPts, base: basePts, unit: 'PTS' },
    { stat: 'reb' as const, d: rebTrend, avg: avgReb, base: baseReb, unit: 'REB' },
    { stat: 'ast' as const, d: astTrend, avg: avgAst, base: baseAst, unit: 'AST' },
  ].filter(s => s.d >= HOT_THRESHOLD);

  if (hotStats.length > 0) {
    const top = hotStats.sort((a, b) => b.d - a.d)[0];
    // Don't add hot if we already have a breakout for same stat
    const hasSameBreakout = signals.some(s => s.type === 'breakout' && s.stat === top.stat);
    if (!hasSameBreakout) {
      signals.push({
        type: 'hot',
        label: '🔥 Heating Up',
        description: `${top.avg.toFixed(1)} ${top.unit} avg — ${Math.round(top.d * 100)}% above baseline`,
        confidence: confidence(top.d, HOT_THRESHOLD),
        stat: top.stat,
      });
    }
  }

  // ── 3. COLD STREAK ────────────────────────────────────────
  if (hotStats.length === 0) {
    const coldStats = [
      { stat: 'pts' as const, d: ptsTrend, unit: 'PTS', avg: avgPts },
      { stat: 'reb' as const, d: rebTrend, unit: 'REB', avg: avgReb },
      { stat: 'ast' as const, d: astTrend, unit: 'AST', avg: avgAst },
    ].filter(s => s.d <= COLD_THRESHOLD && s.avg >= 2); // ignore stats where baseline is tiny

    if (coldStats.length >= 2) {
      // Multiple stats down = real cold streak
      const worst = coldStats.sort((a, b) => a.d - b.d)[0];
      signals.push({
        type: 'cold',
        label: '❄️ Cold Streak',
        description: `Down ${Math.round(Math.abs(worst.d) * 100)}% in ${worst.unit} over last ${window.length} games`,
        confidence: confidence(Math.abs(worst.d), Math.abs(COLD_THRESHOLD)),
        stat: worst.stat,
      });
    }
  }

  // ── 4. CONSISTENT ─────────────────────────────────────────
  // CV (coefficient of variation) < threshold = consistent
  if (recentGames.length >= 3) {
    const ptsSD  = stdDev(recentPts, avgPts);
    const ptsCV  = avgPts > 0 ? ptsSD / avgPts : 1;

    if (ptsCV <= CONSISTENT_CV_MAX && avgPts >= 12) {
      // Only surface if not already hot/cold (they're more interesting)
      const hasStronger = signals.some(s => s.type === 'hot' || s.type === 'cold' || s.type === 'breakout');
      if (!hasStronger) {
        signals.push({
          type: 'consistent',
          label: '📊 Consistent',
          description: `${avgPts.toFixed(1)} PPG · low variance last ${window.length} games`,
          confidence: Math.round((1 - ptsCV / CONSISTENT_CV_MAX) * 60 + 40),
          stat: 'pts',
        });
      }
    }
  }

  // ── 5. DECLINING (recent 2 vs prior games) ────────────────
  if (recentGames.length >= 4 && signals.length === 0) {
    const recentTwo = recentGames.slice(0, 2).map(g => g.points);
    const priorTwo  = recentGames.slice(2, 4).map(g => g.points);
    const recentMean = mean(recentTwo);
    const priorMean  = mean(priorTwo);
    const declDelta  = delta(recentMean, priorMean);

    if (declDelta <= DECLINING_THRESHOLD && priorMean >= 12) {
      signals.push({
        type: 'declining',
        label: '📉 Fading',
        description: `Down ${Math.round(Math.abs(declDelta) * 100)}% in last 2 games`,
        confidence: confidence(Math.abs(declDelta), Math.abs(DECLINING_THRESHOLD)),
        stat: 'pts',
      });
    }
  }

  // Return highest confidence signals first, max 3
  return signals
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

// ─── CONVENIENCE: PRIMARY SIGNAL ──────────────────────────────
export function getPrimarySignal(signals: Signal[]): Signal | null {
  return signals.length > 0 ? signals[0] : null;
}

// ─── SIGNAL COLORS ────────────────────────────────────────────
export function getSignalColor(type: SignalType): { bg: string; border: string; text: string } {
  switch (type) {
    case 'hot':        return { bg: 'rgba(255,100,0,0.12)',  border: 'rgba(255,100,0,0.25)',  text: '#FF6400' };
    case 'breakout':   return { bg: 'rgba(0,200,5,0.12)',    border: 'rgba(0,200,5,0.25)',    text: '#00C805' };
    case 'cold':       return { bg: 'rgba(100,180,255,0.10)',border: 'rgba(100,180,255,0.20)',text: '#64B4FF' };
    case 'consistent': return { bg: 'rgba(167,139,250,0.12)',border: 'rgba(167,139,250,0.25)',text: '#a78bfa' };
    case 'declining':  return { bg: 'rgba(255,59,48,0.10)',  border: 'rgba(255,59,48,0.20)',  text: '#FF3B30' };
  }
}
