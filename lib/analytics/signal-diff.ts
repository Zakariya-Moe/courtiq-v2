import type { Signal, SignalType } from './signals';

export type SignalDiff = {
  added: Signal[];
  removed: Signal[];
  upgraded: Signal[]; // e.g. consistent → hot, hot → breakout
};

const SIGNAL_PRIORITY: Record<SignalType, number> = {
  breakout:   5,
  hot:        4,
  consistent: 3,
  cold:       2,
  declining:  1,
};

/**
 * compareSignals
 * Compares two signal arrays and returns what changed.
 * Deterministic — no side effects.
 */
export function compareSignals(
  prev: Signal[],
  current: Signal[],
): SignalDiff {
  const prevTypes  = new Set(prev.map(s => s.type));
  const currTypes  = new Set(current.map(s => s.type));

  const added   = current.filter(s => !prevTypes.has(s.type));
  const removed = prev.filter(s => !currTypes.has(s.type));

  // Upgraded = primary signal moved to higher priority
  const prevPrimary = prev[0];
  const currPrimary = current[0];
  const upgraded: Signal[] = [];

  if (
    prevPrimary &&
    currPrimary &&
    prevPrimary.type !== currPrimary.type &&
    SIGNAL_PRIORITY[currPrimary.type] > SIGNAL_PRIORITY[prevPrimary.type]
  ) {
    upgraded.push(currPrimary);
  }

  return { added, removed, upgraded };
}

/**
 * isHighPrioritySignal
 * Returns true for signals that deserve visual emphasis.
 */
export function isHighPriority(signal: Signal): boolean {
  return signal.type === 'breakout' || signal.type === 'hot';
}

/**
 * getNewSignalKey
 * Produces a stable cache key from a signal array.
 * Used to detect first-render vs subsequent renders.
 */
export function getSignalKey(signals: Signal[]): string {
  return signals.map(s => `${s.type}:${s.confidence}`).join('|');
}
