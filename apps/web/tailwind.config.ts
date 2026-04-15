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
        brand: {
          50:  '#E8F1FB',
          100: '#C5D9F4',
          200: '#8BB5E8',
          300: '#5191DC',
          400: '#1A6DCE',
          500: '#0055B3',
          600: '#004494',
          700: '#003A70',
          800: '#002B55',
          900: '#001C3A',
        },
        accent: {
          50:  '#E0F7F6',
          100: '#B3EBE9',
          200: '#80DCDA',
          300: '#4DCDCB',
          400: '#1ABFBC',
          500: '#00A99D',
          600: '#008880',
          700: '#006860',
          800: '#004840',
          900: '#002820',
        },
      },
      boxShadow: {
        'brand-sm': '0 1px 3px 0 rgba(0,58,112,0.10)',
        'brand-md': '0 4px 16px -2px rgba(0,58,112,0.14)',
        'brand-lg': '0 10px 30px -4px rgba(0,58,112,0.18)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out both',
        'slide-up':   'slideUp 0.3s ease-out both',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0', transform: 'translateY(8px)' },  '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
