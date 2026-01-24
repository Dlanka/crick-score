/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        // Mobile-first: base size suitable for scoring app
        base: ['16px', { lineHeight: '1.5' }],
        // Larger sizes for scores and important numbers
        'score-sm': ['20px', { lineHeight: '1.4' }],
        'score-md': ['24px', { lineHeight: '1.4' }],
        'score-lg': ['32px', { lineHeight: '1.3' }],
        'score-xl': ['40px', { lineHeight: '1.2' }],
        'score-2xl': ['48px', { lineHeight: '1.2' }],
      },
      spacing: {
        // Touch-friendly spacing for mobile
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
