'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getTeam } from '@/lib/utils/teams';
import type { SearchResult } from '@/app/api/search/route';

const DEBOUNCE_MS = 250;
const MIN_CHARS   = 2;

function SearchIcon({ dim }: { dim?: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke={dim ? 'var(--t4)' : 'var(--t2)'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  );
}

function ResultRow({
  result, focused, onSelect,
}: {
  result: SearchResult;
  focused: boolean;
  onSelect: () => void;
}) {
  const team = getTeam(result.teamAbbr);
  return (
    <button
      onMouseDown={onSelect} // mousedown fires before input blur
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '11px 14px',
        background: focused ? 'var(--s3)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s ease',
      }}
    >
      {/* Team badge */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: team.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', letterSpacing: 0.2 }}>
          {result.teamAbbr}
        </span>
      </div>

      {/* Name + team */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--t1)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {result.playerName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
          {team.city} {team.name}
        </div>
      </div>

      {/* PPG */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', letterSpacing: -0.4 }}>
          {result.avgPts}
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--t4)', marginTop: 1 }}>
          PPG
        </div>
      </div>
    </button>
  );
}

export default function SearchBar() {
  const router = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout>>();

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1); // keyboard nav index

  const showDropdown = focused && (results.length > 0 || (loading && query.length >= MIN_CHARS));

  // Debounced fetch
  const fetchResults = useCallback(async (q: string) => {
    if (q.length < MIN_CHARS) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true); // show loading state immediately
    timerRef.current = setTimeout(() => fetchResults(query), DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [query, fetchResults]);

  // Reset focus index when results change
  useEffect(() => { setFocusIdx(-1); }, [results]);

  function handleSelect(result: SearchResult) {
    setQuery('');
    setResults([]);
    setFocused(false);
    inputRef.current?.blur();
    router.push(`/players/${result.playerId}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && focusIdx >= 0) {
      e.preventDefault();
      handleSelect(results[focusIdx]);
    } else if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      setFocused(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      {/* Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--s1)',
        border: `1px solid ${focused ? 'rgba(255,255,255,0.18)' : 'var(--b1)'}`,
        borderRadius: showDropdown ? '12px 12px 0 0' : 12,
        padding: '11px 14px',
        transition: 'border-color 0.15s ease, border-radius 0.15s ease',
      }}>
        <SearchIcon dim={!focused && !query} />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Search players…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay so mousedown on result fires first
            setTimeout(() => { setFocused(false); }, 150);
          }}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 15,
            color: 'var(--t1)',
            fontFamily: 'var(--font)',
          }}
        />
        {/* Clear button */}
        {query.length > 0 && (
          <button
            onMouseDown={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--s4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, border: 'none', cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
              <line x1="1" y1="1" x2="11" y2="11" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="11" y1="1" x2="1" y2="11" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--s1)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderTop: '1px solid var(--b1)',
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
          zIndex: 50,
          animation: 'fadeIn 0.15s ease both',
        }}>
          {/* Loading shimmer */}
          {loading && results.length === 0 && (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 13, width: '55%', marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 10, width: '35%' }} />
                  </div>
                  <div className="skeleton" style={{ width: 28, height: 16, borderRadius: 4 }} />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && results.length === 0 && query.length >= MIN_CHARS && (
            <div style={{ padding: '16px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--t3)' }}>No players found for "{query}"</p>
            </div>
          )}

          {results.map((r, i) => (
            <div key={r.playerId}>
              {i > 0 && (
                <div style={{ height: 1, background: 'var(--b1)', margin: '0 14px' }} />
              )}
              <ResultRow
                result={r}
                focused={i === focusIdx}
                onSelect={() => handleSelect(r)}
              />
            </div>
          ))}

          {/* Footer */}
          {results.length > 0 && (
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--b1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}>
              <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 500 }}>
                {results.length} result{results.length !== 1 ? 's' : ''} · tap to view profile
              </span>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
