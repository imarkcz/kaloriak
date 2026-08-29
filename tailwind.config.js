/** @type {import('tailwindcss').Config} */
// Tokens follow DESIGN.md. Direction is taken from superconscious-app.webflow.io:
// deep near-black ground, violet glow, one geometric sans, soft rounded dark cards.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0c0b0c',
        surface: '#131215',
        'surface-2': '#1a181d',
        'surface-3': '#232028',
        line: 'rgba(255,255,255,0.07)',
        'line-2': 'rgba(255,255,255,0.14)',

        ink: {
          DEFAULT: '#ffffff',
          soft: 'rgba(255,255,255,0.70)',
          mute: 'rgba(255,255,255,0.45)',
          dim: 'rgba(255,255,255,0.30)',
        },

        violet: {
          200: '#d9caff',
          300: '#b9a3ff',
          400: '#a78bfa',
          500: '#8f69e0',
          600: '#7c4ddb',
          700: '#6535bd',
        },
        lilac: '#edc5fc',

        macro: {
          protein: '#f47da6',
          carbs: '#e8b45f',
          fat: '#6ec2f0',
        },

        // Semantic state — deliberately separate from the violet accent.
        danger: '#f0765a',
        warn: '#e0a03f',
        ok: '#5ecf9e',
      },

      fontFamily: {
        sans: ['"Wix Madefor Display"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },

      fontSize: {
        // Fixed rem scale, ratio 1.2. Smallest label is 12px — see DESIGN.md.
        micro: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.15rem' }],
        base: ['0.9375rem', { lineHeight: '1.4rem' }],
        h3: ['1.0625rem', { lineHeight: '1.35rem', letterSpacing: '-0.015em' }],
        h2: ['1.3125rem', { lineHeight: '1.6rem', letterSpacing: '-0.025em' }],
        h1: ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.035em' }],
        hero: ['2.5rem', { lineHeight: '1', letterSpacing: '-0.045em' }],
        display: ['3.5rem', { lineHeight: '0.95', letterSpacing: '-0.055em' }],
      },

      letterSpacing: {
        label: '0.08em',
        num: '-0.05em',
      },

      borderRadius: {
        field: '1rem',
        card: '1.5rem',
        'card-lg': '1.75rem',
      },

      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 60px -30px rgba(0,0,0,0.9)',
        violet: '0 10px 34px -12px rgba(143,105,224,0.6)',
        'violet-lg': '0 18px 60px -18px rgba(143,105,224,0.7)',
      },

      transitionTimingFunction: {
        // ease-out-expo. No bounce anywhere in the app.
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      animation: {
        reveal: 'reveal 460ms cubic-bezier(0.16,1,0.3,1) both',
        sweep: 'sweep 8s linear infinite',
        drift: 'drift 42s ease-in-out infinite',
        'drift-slow': 'drift 64s ease-in-out infinite reverse',
        breathe: 'breathe 7s ease-in-out infinite',
        'spin-slow': 'spin 2.4s linear infinite',
      },

      keyframes: {
        reveal: {
          '0%': { opacity: '0', transform: 'translate3d(0,10px,0)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(6%,-8%,0) scale(1.12)' },
          '66%': { transform: 'translate3d(-7%,5%,0) scale(0.94)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
};
