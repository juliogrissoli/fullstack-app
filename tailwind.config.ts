import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        soberano: {
          deep: '#0A192F',      // Deep Ocean Blue
          gold: '#D4AF37',      // Imperial Gold
          emerald: '#004D40',   // Deep Emerald
          midnight: '#0D1B2A',  // Midnight Blue
          steel: '#1B263B',    // Steel Gray
          pearl: '#F8F9FA',    // Pearl White
          crimson: '#8B0000',   // Imperial Crimson
          bronze: '#CD7F32',    // Imperial Bronze
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        'imperial': ['Georgia', 'serif'],
        'modern': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'gold-glow': 'goldGlow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        goldGlow: {
          '0%': {
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
            borderColor: '#D4AF37',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(212, 175, 55, 0.6)',
            borderColor: '#F4E4C1',
          },
          '100%': {
            boxShadow: '0 0 40px rgba(212, 175, 55, 0.9)',
            borderColor: '#D4AF37',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '0% 0%',
          },
          '100%': {
            backgroundPosition: '100% 100%',
          },
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F4E4C1 50%, #D4AF37 100%)',
        'deep-gradient': 'linear-gradient(135deg, #0A192F 0%, #1B263B 50%, #0D1B2A 100%)',
        'imperial-gradient': 'linear-gradient(135deg, #0A192F 0%, #D4AF37 100%)',
      },
      boxShadow: {
        'gold': '0 4px 20px rgba(212, 175, 55, 0.3)',
        'gold-lg': '0 10px 40px rgba(212, 175, 55, 0.4)',
        'imperial': '0 8px 32px rgba(10, 25, 47, 0.8)',
        'deep': '0 4px 20px rgba(13, 27, 42, 0.9)',
      },
      backdropBlur: {
        'imperial': '12px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
  darkMode: 'class',
};

export default config;
