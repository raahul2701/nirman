/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        sidebar: 'var(--sidebar)',
        ink: 'var(--text)',
      },
      boxShadow: {
        enterprise: '0 18px 45px rgba(0, 95, 86, 0.08)',
        command: '0 24px 70px rgba(0, 95, 86, 0.14)',
      },
    },
  },
  plugins: [],
};
