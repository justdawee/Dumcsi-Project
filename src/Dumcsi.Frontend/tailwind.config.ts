import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          blurple: '#5865F2',
          green: '#57F287',
          yellow: '#FEE75C',
          fuchsia: '#EB459E',
          red: '#ED4245',
          white: '#FFFFFF',
          'gray-900': '#23272A',
          'gray-800': '#2C2F33',
          'gray-700': '#36393F',
          'gray-600': '#4F545C',
          'gray-500': '#72767D',
          'gray-400': '#99AAB5',
          'gray-300': '#B9BBBE',
          'gray-200': '#DCDDDE',
          'gray-100': '#E3E5E8',
        }
      },
      fontFamily: {
        sans: ['Whitney', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
} satisfies Config