/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101820',
        paper: '#F7F8FA',
        navy: {
          900: '#0B1421',
          800: '#0F1B2D',
          700: '#16283F',
          600: '#233A57',
        },
        teal: {
          50: '#EAF4F4',
          100: '#D2E7E8',
          500: '#227F88',
          600: '#1B6E76',
          700: '#155860',
        },
        amber: {
          50: '#FBEEE4',
          500: '#D6741F',
          600: '#C7621B',
        },
        success: {
          50: '#EAF6EE',
          600: '#2F7D4F',
        },
        line: '#E2E5EA',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 20, 33, 0.06)',
      },
    },
  },
  plugins: [],
}
