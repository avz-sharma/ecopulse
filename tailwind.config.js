/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          950: 'var(--bg-950)',
          900: 'var(--bg-900)',
          850: 'var(--bg-850)',
        },
        surface: {
          800: 'var(--surface-800)',
          700: 'var(--surface-700)',
        },
        primary: {
          500: 'var(--primary-500)',
          400: 'var(--primary-400)',
          300: 'var(--primary-300)',
        },
        amber: {
          500: 'var(--amber-500)',
          400: 'var(--amber-400)',
        },
        orange: {
          500: 'var(--orange-500)',
        },
        red: {
          500: 'var(--red-500)',
        },
        text: {
          100: 'var(--text-100)',
          300: 'var(--text-300)',
          500: 'var(--text-500)',
        },
        border: {
          soft: 'var(--border-soft)',
        },
      },
    },
  },
  plugins: [],
}
