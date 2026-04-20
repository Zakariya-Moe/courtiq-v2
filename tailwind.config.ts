import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // ── Color system — mirrors CSS vars ──────────────────────
      colors: {
        bg: '#000000',
        s1: '#0d0d0d',
        s2: '#141414',
        s3: '#1c1c1c',
        s4: '#242424',
        green: {
          DEFAULT: '#00C805',
          10: 'rgba(0,200,5,0.10)',
          20: 'rgba(0,200,5,0.20)',
          40: 'rgba(0,200,5,0.40)',
        },
        red: {
          DEFAULT: '#FF3B30',
          10: 'rgba(255,59,48,0.10)',
          20: 'rgba(255,59,48,0.20)',
        },
        amber: '#FF9F0A',
        signal: {
          hot:        '#FF6400',
          breakout:   '#00C805',
          cold:       '#64B4FF',
          consistent: '#a78bfa',
          declining:  '#FF3B30',
        },
      },

      // ── Typography — Syne display + DM Sans body ─────────────
      fontFamily: {
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-dm-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:    ['var(--font-dm-mono)', 'SF Mono', 'Consolas', 'monospace'],
      },

      // ── Type scale — 4-level hierarchy ───────────────────────
      fontSize: {
        // Caption
        '2xs': ['10px', { lineHeight: '1.4', letterSpacing: '0.06em' }],
        xs:    ['11px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
        // Secondary
        sm:    ['13px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        base:  ['15px', { lineHeight: '1.5', letterSpacing: '-0.015em' }],
        // Primary
        lg:    ['17px', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
        xl:    ['20px', { lineHeight: '1.3', letterSpacing: '-0.025em' }],
        '2xl': ['24px', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
        '3xl': ['30px', { lineHeight: '1.1', letterSpacing: '-0.04em' }],
        // Hero
        '4xl': ['40px', { lineHeight: '1',   letterSpacing: '-0.05em' }],
        '5xl': ['52px', { lineHeight: '1',   letterSpacing: '-0.06em' }],
        '6xl': ['64px', { lineHeight: '0.95', letterSpacing: '-0.07em' }],
      },

      // ── Border radius ─────────────────────────────────────────
      borderRadius: {
        sm:  '10px',
        md:  '16px',
        lg:  '22px',
        xl:  '28px',
        '2xl': '36px',
      },

      // ── Spacing extras ────────────────────────────────────────
      spacing: {
        nav:  '68px',
        page: '18px',
        safe: 'env(safe-area-inset-bottom, 0px)',
      },

      // ── Backdrop blur ─────────────────────────────────────────
      backdropBlur: {
        nav: '32px',
      },

      // ── Box shadow ────────────────────────────────────────────
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
        glow:    '0 0 20px rgba(0,200,5,0.25)',
        'glow-hot':   '0 0 20px rgba(255,100,0,0.25)',
      },

      // ── Animation durations ───────────────────────────────────
      transitionDuration: {
        fast:  '150ms',
        base:  '250ms',
        slow:  '400ms',
        chart: '700ms',
      },

      // ── Custom easing ─────────────────────────────────────────
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-spring':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-in-out':   'cubic-bezier(0.65, 0, 0.35, 1)',
      },

      // ── Keyframes ─────────────────────────────────────────────
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        livePulse: {
          '0%, 100%': { opacity: '1',   transform: 'scale(1)' },
          '50%':      { opacity: '0.45', transform: 'scale(0.85)' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        barGrow: {
          from: { transform: 'scaleX(0)' },
          to:   { transform: 'scaleX(1)' },
        },
        scoreFlash: {
          '0%':   { color: 'var(--green)' },
          '100%': { color: 'inherit' },
        },
      },

      animation: {
        'fade-up':    'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':    'fadeIn 0.3s ease both',
        shimmer:      'shimmer 1.8s linear infinite',
        'live-pulse': 'livePulse 2s ease-in-out infinite',
        'count-up':   'countUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'bar-grow':   'barGrow 0.8s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
