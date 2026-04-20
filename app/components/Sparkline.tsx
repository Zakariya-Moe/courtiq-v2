'use client';
import { useId } from 'react';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function Sparkline({ data, width = 64, height = 30, color = '#00C805' }: Props) {
  const id = useId().replace(/:/g, '');
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y] as [number, number];
  });

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fillPath = `M 0,${height} L ${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')} L ${width},${height} Z`;

  const len = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return 0;
    const [px, py] = pts[i - 1];
    return acc + Math.sqrt((x - px) ** 2 + (y - py) ** 2);
  }, 0);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <style>{`
          @keyframes spkDraw${id} {
            from { stroke-dashoffset: ${len + 10}; opacity: 0; }
            to   { stroke-dashoffset: 0; opacity: 1; }
          }
        `}</style>
      </defs>
      <path d={fillPath} fill={`url(#g${id})`} />
      <path
        d={linePath}
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len + 10}
        style={{
          animation: `spkDraw${id} 0.8s cubic-bezier(0.16,1,0.3,1) both`,
        }}
      />
    </svg>
  );
}
