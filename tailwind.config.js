/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Coral / peach primary — warm, food-friendly
        coral: {
          50: '#fff1ee',
          100: '#ffe1da',
          200: '#ffc6b8',
          300: '#ffa089',
          400: '#fb7185',
          500: '#f97366',
          600: '#ea5a4a',
          700: '#c44232',
          800: '#9a3327',
          900: '#7c2a22',
        },
        // Dark surfaces
        bg: '#0a0a0b',
        surface: '#141416',
        'surface-2': '#1c1c20',
        'surface-3': '#26262c',
        border: '#2a2a30',
        'border-soft': '#1f1f24',
        ink: {
          DEFAULT: '#fafafa',
          soft: '#a1a1aa',
          mute: '#71717a',
          line: '#2a2a30',
        },
        // Macro accent colors (vibrant)
        macro: {
          protein: '#fb7185',
          carbs: '#fbbf24',
          fat: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tight2: '-0.025em',
      },
      backgroundImage: {
        'grad-coral': 'linear-gradient(135deg, #ff8a65 0%, #f43f5e 100%)',
        'grad-protein': 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)',
        'grad-carbs': 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
        'grad-fat': 'linear-gradient(135deg, #c4b5fd 0%, #7c3aed 100%)',
        'grad-glow': 'radial-gradient(circle at 30% 30%, rgba(251,113,133,0.18), transparent 60%)',
      },
      boxShadow: {
        'coral-glow': '0 10px 40px -10px rgba(249,115,102,0.55)',
        'coral-soft': '0 8px 24px -6px rgba(249,115,102,0.35)',
      },
      animation: {
        'fade-up': 'fadeUp 400ms cubic-bezier(.2,.8,.2,1) both',
        'pop': 'pop 320ms cubic-bezier(.34,1.56,.64,1) both',
        'shimmer': 'shimmer 2s linear infinite',
        'ring-pulse': 'ringPulse 3.6s ease-in-out infinite',
        'ring-shimmer': 'ringShimmer 4s linear infinite',
        'ring-halo': 'ringHalo 12s linear infinite',
        'orbit-1': 'orbit 6s linear infinite',
        'orbit-2': 'orbit 9s linear infinite reverse',
        'orbit-3': 'orbit 14s linear infinite',
        'ember': 'ember 2.6s ease-out infinite',
        'water-fill': 'waterFill 600ms cubic-bezier(.34,1.56,.64,1) both',
        'water-wave': 'waterWave 3.2s ease-in-out infinite',
        'water-wave-slow': 'waterWave 5.5s ease-in-out infinite reverse',
        'pill-spark': 'pillSpark 2.4s ease-out infinite',
        'pill-halo': 'pillHalo 600ms ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        ringPulse: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(0.95)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
        ringShimmer: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        ringHalo: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        orbit: {
          '0%':   { transform: 'rotate(0deg) translateX(var(--orbit-r,110px)) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(var(--orbit-r,110px)) rotate(-360deg)' },
        },
        ember: {
          '0%':   { transform: 'translate(0, 0) scale(0.6)', opacity: '0' },
          '15%':  { opacity: '0.9' },
          '100%': { transform: 'translate(var(--ember-x,0), -90px) scale(0.2)', opacity: '0' },
        },
        waterFill: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        waterWave: {
          '0%, 100%': { transform: 'translateX(-25%)' },
          '50%': { transform: 'translateX(0%)' },
        },
        pillSpark: {
          '0%':   { transform: 'translateY(0) scale(0.4)', opacity: '0' },
          '20%':  { opacity: '1' },
          '100%': { transform: 'translateY(-70px) scale(0.2)', opacity: '0' },
        },
        pillHalo: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
