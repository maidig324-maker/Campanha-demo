import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#121629',
          light: '#1B2140',
          lighter: '#252C52',
        },
        gold: {
          DEFAULT: '#F0B429',
          soft: '#FBE3A3',
        },
        status: {
          available: '#22C55E',
          'available-soft': '#DCFCE7',
          reserved: '#F5A524',
          'reserved-soft': '#FEF3C7',
          confirmed: '#E1473A',
          'confirmed-soft': '#FEE2E2',
        },
      },
      fontFamily: {
        display: ['var(--font-sora)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
