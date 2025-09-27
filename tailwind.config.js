/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
      "./index.html",
      "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
          'noto-bangla': ['Noto Sans Bengali','sans-serif'],
          'open-sans': ['Open Sans','serif'],
          'lily': ['Courgette']
        },
    },
  },
  plugins: [],
  darkMode: 'class'
}
