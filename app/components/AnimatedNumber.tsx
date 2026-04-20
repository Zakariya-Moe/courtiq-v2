'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
  prefix?: string;
  suffix?: string;
  /** Use Framer Motion spring (smoother for scores) vs RAF easing (faster) */
  mode?: 'spring' | 'raf';
}

// ── Spring-based version (Framer Motion) ─────────────────────
function SpringNumber({ value, decimals, prefix, suffix, className, style }: Props) {
  const spring = useSpring(value, { stiffness: 120, damping: 20, mass: 0.8 });
  const display = useTransform(spring, (v) =>
    decimals && decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()
  );

  useEffect(() => { spring.set(value); }, [spring, value]);

  return (
    <motion.span className={className} style={style}>
      {prefix}
      <motion.span style={{ fontVariantNumeric: 'tabular-nums' }}>{display}</motion.span>
      {suffix}
    </motion.span>
  );
}

// ── RAF-based version (legacy, for live score updates) ────────
function RAFNumber({ value, duration = 700, decimals = 0, className, style, prefix = '', suffix = '' }: Props) {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const fromRef  = useRef(value);

  useEffect(() => {
    fromRef.current  = display;
    startRef.current = null;
    cancelAnimationFrame(frameRef.current);

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const t      = Math.min((ts - startRef.current) / duration, 1);
      const eased  = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(current);
      if (t < 1) frameRef.current = requestAnimationFrame(animate);
      else setDisplay(value);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const fmt = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();
  return <span className={className} style={style}>{prefix}{fmt}{suffix}</span>;
}

export default function AnimatedNumber({ mode = 'raf', ...props }: Props) {
  return mode === 'spring'
    ? <SpringNumber {...props} />
    : <RAFNumber    {...props} />;
}
