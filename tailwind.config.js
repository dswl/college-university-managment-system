module.exports = {
  content: ['./views/*.{hbs,js}', './views/partials/*.{hbs,js}'],
  theme: {
    fontFamily: {
      sans: ["Red Hat Display", 'serif']
    },
    extend: {
      animation: {
        'pulseFlash':'animate-bounce 3s bg-sky-400 opacity-75 linear infinite'
      }
    }
  },
  plugins: [],
}
