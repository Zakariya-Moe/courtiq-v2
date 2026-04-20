'use client';

import { useEffect, useState } from 'react';
import { formatAge } from '@/lib/analytics/freshness';

interface Props {
  timestamp: string; // ISO string from last_updated
  isLive: boolean;
}

export default function LastUpdated({ timestamp, isLive }: Props) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const tick = () => {
      const ageMs = Date.now() - new Date(timestamp).getTime();
      setLabel(formatAge(ageMs));
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [timestamp]);

  if (!label) return null;

  return (
    <span style={{
      fontSize: 10,
      color: isLive ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.22)',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: 0.1,
    }}>
      {label}
    </span>
  );
}
