/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Palette values live in CSS variables (src/index.css) so the `.coffee`
      // root class can swap the whole palette without per-component classes.
      colors: {
        cream: {
          50: 'rgb(var(--cream-50) / <alpha-value>)',
          100: 'rgb(var(--cream-100) / <alpha-value>)',
          200: 'rgb(var(--cream-200) / <alpha-value>)',
          300: 'rgb(var(--cream-300) / <alpha-value>)',
        },
        clay: {
          400: 'rgb(var(--clay-400) / <alpha-value>)',
          500: 'rgb(var(--clay-500) / <alpha-value>)',
          600: 'rgb(var(--clay-600) / <alpha-value>)',
        },
        ink: {
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 8px 30px rgba(34, 28, 23, 0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
