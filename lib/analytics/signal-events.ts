// ─────────────────────────────────────────────────────────────
// SIGNAL EVENT STORE
// In-memory only. No database. No global state library.
// Module-level array persists for the browser session.
// ─────────────────────────────────────────────────────────────

import type { Signal } from './signals';

export type SignalEvent = {
  id: string;
  playerId: string;
  playerName: string;
  teamAbbr: string;
  signal: Signal;
  timestamp: number; // ms since epoch
};

const MAX_EVENTS = 50;

// Module-level store — survives navigation within the SPA session
const store: SignalEvent[] = [];

let _counter = 0;

/**
 * recordSignalEvent
 * Call this whenever compareSignals returns a new high-priority signal.
 */
export function recordSignalEvent(
  playerId: string,
  playerName: string,
  teamAbbr: string,
  signal: Signal,
): void {
  // Deduplicate: don't re-record the same player+signal type within 2 minutes
  const twoMinutes = 2 * 60 * 1000;
  const recent = store.find(
    e =>
      e.playerId === playerId &&
      e.signal.type === signal.type &&
      Date.now() - e.timestamp < twoMinutes,
  );
  if (recent) return;

  const event: SignalEvent = {
    id: `${++_counter}-${playerId}-${signal.type}`,
    playerId,
    playerName,
    teamAbbr,
    signal,
    timestamp: Date.now(),
  };

  // Prepend so most recent is first
  store.unshift(event);

  // Trim to max
  if (store.length > MAX_EVENTS) store.splice(MAX_EVENTS);
}

/**
 * getSignalEvents
 * Returns a shallow copy so callers can't mutate the store.
 */
export function getSignalEvents(limit = 10): SignalEvent[] {
  return store.slice(0, limit);
}

/**
 * getHighPriorityEvents
 * Only breakout and hot events, most recent first.
 */
export function getHighPriorityEvents(limit = 10): SignalEvent[] {
  return store
    .filter(e => e.signal.type === 'breakout' || e.signal.type === 'hot')
    .slice(0, limit);
}

/**
 * clearEvents — for testing / dev use only
 */
export function clearEvents(): void {
  store.splice(0);
}

/**
 * fmtRelativeTime
 * Deterministic relative time label from a timestamp.
 */
export function fmtRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10)  return 'just now';
  if (seconds < 60)  return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)  return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
