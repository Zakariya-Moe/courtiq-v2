// ─────────────────────────────────────────────────────────────
// FAVORITES SYSTEM
// Client-side only. localStorage. No auth. No backend.
// SSR-safe: all localStorage access is guarded.
// ─────────────────────────────────────────────────────────────

const KEY = 'ciq_favorites';

function readStore(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeStore(set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Storage full or blocked — fail silently
  }
}

/** Returns all favorited player IDs */
export function getFavorites(): string[] {
  return Array.from(readStore());
}

/** Returns true if playerId is favorited */
export function isFavorite(playerId: string): boolean {
  return readStore().has(playerId);
}

/**
 * Toggle favorite state for a player.
 * Returns the new state: true = now following, false = unfollowed.
 */
export function toggleFavorite(playerId: string): boolean {
  const store = readStore();
  if (store.has(playerId)) {
    store.delete(playerId);
    writeStore(store);
    return false;
  } else {
    store.add(playerId);
    writeStore(store);
    return true;
  }
}

/** Returns true if user has any favorites */
export function hasFavorites(): boolean {
  return readStore().size > 0;
}

/** Returns count of favorites */
export function favoritesCount(): number {
  return readStore().size;
}
