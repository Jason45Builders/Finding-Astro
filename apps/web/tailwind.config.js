/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        astro: {
          cream: '#F5F1E8',
          dark: '#2E2A24',
          clay: '#A4472A',
          sand: '#6B6257',
          accent: '#D96C3F',
          sage: '#4A7C59',
          warning: '#C9A227',
          danger: '#B83232',
        }
      }
    },
  },
  plugins: [],
}