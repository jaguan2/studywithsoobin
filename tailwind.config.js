/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#F8F2E9',
          200: '#F1E7D6',
          300: '#E8D9BE',
        },
        clay: {
          400: '#E3A86B',
          500: '#D9924F',
          600: '#C77D3C',
        },
        ink: {
          700: '#4A4038',
          800: '#332B25',
          900: '#221C17',
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
