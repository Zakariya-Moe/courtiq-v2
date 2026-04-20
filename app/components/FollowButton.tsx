'use client';

import { useState, useEffect } from 'react';
import { isFavorite, toggleFavorite } from '@/lib/user/favorites';

interface Props {
  playerId: string;
  playerName: string;
}

export default function FollowButton({ playerId, playerName }: Props) {
  const [following, setFollowing] = useState(false);
  const [burst, setBurst] = useState(false);

  // Read initial state client-side (localStorage not available during SSR)
  useEffect(() => {
    setFollowing(isFavorite(playerId));
  }, [playerId]);

  function handleToggle() {
    const next = toggleFavorite(playerId);
    setFollowing(next);
    if (next) {
      // Trigger scale burst animation on follow
      setBurst(true);
      setTimeout(() => setBurst(false), 400);
    }
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={following ? `Unfollow ${playerName}` : `Follow ${playerName}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 18px',
        borderRadius: 100,
        border: following ? 'none' : '1px solid var(--b2)',
        background: following ? 'var(--green)' : 'transparent',
        color: following ? '#000' : 'var(--t2)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
        transform: burst ? 'scale(1.08)' : 'scale(1)',
        // Spring back after burst
        transitionProperty: burst ? 'transform' : 'background, color, border-color, transform',
        transitionDuration: burst ? '0.15s' : '0.2s',
        transitionTimingFunction: burst ? 'cubic-bezier(0.34,1.56,0.64,1)' : 'ease',
        flexShrink: 0,
      }}
    >
      {/* Star icon */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={following ? '#000' : 'none'}
        stroke={following ? '#000' : 'var(--t2)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'fill 0.2s ease, stroke 0.2s ease',
          transform: burst ? 'rotate(-15deg) scale(1.2)' : 'rotate(0deg) scale(1)',
          transitionDuration: burst ? '0.15s' : '0.3s',
        }}
      >
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
