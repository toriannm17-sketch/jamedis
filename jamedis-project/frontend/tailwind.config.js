/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#effafa',
          100: '#d6f1f0',
          200: '#b0e3e2',
          300: '#7dcdcd',
          400: '#47b0b3',
          500: '#2c9598',
          600: '#237a7f',
          700: '#206267',
          800: '#1f4f54',
          900: '#1e4247',
        },
      },
    },
  },
  plugins: [],
};
