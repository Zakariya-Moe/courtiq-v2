'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedNumber({
  value, duration = 700, decimals = 0,
  className, style, prefix = '', suffix = '',
}: Props) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    cancelAnimationFrame(frameRef.current);

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      // ease out expo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(animate);
      else setDisplay(value);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const fmt = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toString();

  return <span className={className} style={style}>{prefix}{fmt}{suffix}</span>;
}
