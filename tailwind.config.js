/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#5c67f2',
        secondary: '#4a54e1',
        dark: '#1a1a2e',
        darker: '#16213e',
        accent: '#0f3460',
      },
    },
  },
  plugins: [],
};
