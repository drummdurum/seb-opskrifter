/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        // Primære neutrale
        'warm-beige': '#E8DCCF',
        'sand-light': '#F3EAE2',
        'warm-taupe': '#D6C2B2',
        'dark-brown': '#4A3728',
        'tree-brown': '#6B4F3A',
        // Accentfarve (tomat)
        'red-accent': '#B23A2E',
        'red-accent-dark': '#8E2C23',
        'red-accent-bright': '#D24B3F',
        // Supplerende
        'coffee-dark': '#2E1F1A',
        'oat-brown': '#C9A27E',
        'olive-muted': '#6F7D5C',
      },
    },
  },
  plugins: [],
}
