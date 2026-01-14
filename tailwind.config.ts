import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        capitol: {
          red: '#C41230',
          'red-dark': '#9E0F28',
          'red-light': '#D91A3C',
          dark: '#1A1A1A',
          gray: '#4A4A4A',
          light: '#F5F5F5',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
