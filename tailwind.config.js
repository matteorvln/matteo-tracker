/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        dark: { 1: '#080C10', 2: '#0E1318', 3: '#161D24', 4: '#1E262F' },
        gold: { DEFAULT: '#F0C040', dark: '#E8A020' },
        accent: { red: '#FF4455', green: '#22D37A', blue: '#3B82F6', purple: '#8B5CF6' }
      }
    }
  },
  plugins: []
}
