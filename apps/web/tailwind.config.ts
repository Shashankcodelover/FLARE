import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        tactical: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        tactical: {
          orange: '#ea580c',
          green: '#22c55e',
          yellow: '#eab308',
          slate: '#64748b',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

