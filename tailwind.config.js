/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00A5B5',
          dark: '#008A98',
          light: '#4DC4CF',
          50: '#E6F7F8',
          100: '#CCF0F2',
          200: '#99E1E5',
          300: '#66D2D8',
          400: '#33C3CB',
          500: '#00A5B5',
          600: '#008491',
          700: '#00636D',
          800: '#004249',
          900: '#002124',
        },
        secondary: {
          DEFAULT: '#E31E24',
          dark: '#B8181D',
          light: '#F15A5F',
          50: '#FDE8E9',
          100: '#FBD1D2',
          200: '#F7A3A5',
          300: '#F37578',
          400: '#EF474B',
          500: '#E31E24',
          600: '#B6181D',
          700: '#891216',
          800: '#5B0C0F',
          900: '#2E0607',
        },
        accent: {
          DEFAULT: '#1B365D',
          dark: '#132542',
          light: '#2A4A7A',
          50: '#E8ECF2',
          100: '#D1D9E5',
          200: '#A3B3CB',
          300: '#758DB1',
          400: '#476797',
          500: '#1B365D',
          600: '#162B4A',
          700: '#112038',
          800: '#0B1525',
          900: '#060B13',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.12), 0 8px 24px -4px rgba(0, 0, 0, 0.12)',
        'dropdown': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}
