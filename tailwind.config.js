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
        // Theme palette
        background: {
          light: '#F8FAFC',
          dark: '#0F172A',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1E293B',
        },
        border: {
          light: '#E2E8F0',
          dark: '#334155',
        },
        brand: {
          light: '#2563EB',
          dark: '#3B82F6',
          DEFAULT: '#2563EB',
        },
        success: {
          light: '#16A34A',
          dark: '#22C55E',
        },
        warning: {
          light: '#D97706',
          dark: '#F59E0B',
        },
        danger: {
          light: '#DC2626',
          dark: '#EF4444',
        },
        textPrimary: {
          light: '#0F172A',
          dark: '#F1F5F9',
        },
        textMuted: {
          light: '#64748B',
          dark: '#94A3B8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
