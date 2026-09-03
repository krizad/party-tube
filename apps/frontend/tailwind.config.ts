import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-prompt)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        party: {
          dark: '#0B0D17',
          card: '#151928',
          cardHover: '#1D2237',
          neonPurple: '#A855F7',
          neonPink: '#EC4899',
          neonCyan: '#06B6D4',
          neonAmber: '#F59E0B',
          glowBorder: '#2E3856',
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'equalizer': 'equalizer 1.2s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.6))' },
          '50%': { opacity: '0.8', filter: 'drop-shadow(0 0 30px rgba(236, 72, 153, 0.8))' },
        },
        equalizer: {
          '0%': { height: '20%' },
          '100%': { height: '100%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
