/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom ChadVC theme palette
        chad: {
          // Base backgrounds (darker variants of Shadow Grey)
          bg: {
            dark: '#1a1d26',      // Darkest - main background
            DEFAULT: '#1e222d',   // Dark - secondary background
            light: '#272838',     // Shadow Grey - cards/panels
          },
          // Accent colors
          grape: {
            DEFAULT: '#5D536B',   // Vintage Grape
            light: '#6d6379',
          },
          lavender: {
            DEFAULT: '#7D6B91',   // Vintage Lavender
            light: '#8d7ba1',
          },
          // Text colors
          platinum: '#EAEBED',    // Primary text
          // Accent/highlight
          steel: {
            DEFAULT: '#A3BAC3',   // Cool Steel - primary accent
            dark: '#8aa3ad',
            light: '#b8cad2',
          },
          // Utility colors
          border: '#363a48',      // Subtle borders
          muted: '#6b7280',       // Muted text
        },
      },
    },
  },
  plugins: [],
}
