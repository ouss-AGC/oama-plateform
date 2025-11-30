/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        military: {
          green: '#2d5016',
          gray: '#4a5568',
          beige: '#d4c5a0',
        }
      }
    },
  },
  plugins: [],
}
