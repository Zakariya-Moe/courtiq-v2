'use client';
import { useState, useId } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import AnimatedNumber from './AnimatedNumber';

type StatKey = 'points' | 'rebounds' | 'assists';

const TABS: { key: StatKey; label: string; color: string }[] = [
  { key: 'points',   label: 'PTS', color: '#00C805' },
  { key: 'rebounds', label: 'REB', color: '#a78bfa' },
  { key: 'assists',  label: 'AST', color: '#38bdf8' },
];

interface GameEntry {
  points: number;
  rebounds: number;
  assists: number;
  label?: string;
}

interface Props {
  games: GameEntry[];
  teamAbbr?: string;
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{
      background: 'rgba(20,20,20,0.95)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      padding: '10px 14px',
      backdropFilter: 'blur(20px)',
      minWidth: 80,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: p.color, letterSpacing: -0.5 }}>
        {typeof p.value === 'number' ? p.value.toFixed(0) : p.value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
        {p.payload?.label || ''}
      </div>
    </div>
  );
}

export default function PerformanceChart({ games }: Props) {
  const [active, setActive] = useState<StatKey>('points');
  const uid = useId().replace(/:/g, '');

  if (!games || games.length < 2) return null;

  const tab = TABS.find(t => t.key === active)!;

  // Chronological order
  const chartData = [...games].reverse().map((g, i) => ({
    i: i + 1,
    value: g[active],
    label: g.label || `G${i + 1}`,
    points: g.points,
    rebounds: g.rebounds,
    assists: g.assists,
  }));

  const vals = chartData.map(d => d.value);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const last = vals[vals.length - 1];
  const first = vals[0];
  const delta = last - first;
  const deltaPct = first > 0 ? ((delta / first) * 100) : 0;
  const isUp = delta >= 0;

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1.5, color: tab.color, lineHeight: 1 }}>
            <AnimatedNumber value={last} decimals={0} duration={600} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span className={isUp ? 'badge-up' : 'badge-down'}>
              {isUp ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%
            </span>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>
              last {chartData.length} games
            </span>
          </div>
        </div>

        {/* Stat toggle */}
        <div style={{
          display: 'flex', gap: 3,
          background: 'var(--s3)', borderRadius: 10, padding: 3,
        }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              style={{
                padding: '5px 11px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.3,
                background: active === t.key ? 'var(--s4)' : 'transparent',
                color: active === t.key ? t.color : 'var(--t3)',
                transition: 'all 0.15s ease',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div key={active} style={{ animation: 'fadeIn 0.3s ease both' }}>
        <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 6, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad${uid}${active}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={tab.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={tab.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="i"
              tick={{ fill: 'rgba(255,255,255,0.18)', fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.18)', fontSize: 10 }}
              axisLine={false} tickLine={false}
              domain={['auto', 'auto']}
            />
            <ReferenceLine
              y={avg}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="4 4"
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={tab.color}
              strokeWidth={2.5}
              fill={`url(#grad${uid}${active})`}
              dot={{ fill: tab.color, r: 3, strokeWidth: 0 }}
              activeDot={{ fill: tab.color, r: 5, strokeWidth: 2, stroke: 'rgba(0,0,0,0.5)' }}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Avg line label */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--t4)' }}>
          avg {avg.toFixed(1)} {tab.label}
        </span>
      </div>
    </div>
  );
}
