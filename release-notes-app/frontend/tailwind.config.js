/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // MARS token-backed colors
        mars: {
          primary: 'var(--mars-color-primary)',
          'primary-hover': 'var(--mars-color-primary-hover)',
          'primary-subtle': 'var(--mars-color-primary-subtle)',
          accent: 'var(--mars-color-accent)',
          'accent-hover': 'var(--mars-color-accent-hover)',
          surface: 'var(--mars-color-surface)',
          'surface-raised': 'var(--mars-color-surface-raised)',
          'surface-overlay': 'var(--mars-color-surface-overlay)',
          bg: 'var(--mars-color-bg)',
          'bg-secondary': 'var(--mars-color-bg-secondary)',
          'bg-hover': 'var(--mars-color-bg-hover)',
          text: 'var(--mars-color-text)',
          'text-secondary': 'var(--mars-color-text-secondary)',
          'text-tertiary': 'var(--mars-color-text-tertiary)',
          border: 'var(--mars-color-border)',
          'border-strong': 'var(--mars-color-border-strong)',
          success: 'var(--mars-color-success)',
          warning: 'var(--mars-color-warning)',
          danger: 'var(--mars-color-danger)',
          info: 'var(--mars-color-info)',
        },
        console: {
          bg: '#1a1a1a',
          text: '#e5e5e5',
          success: '#22c55e',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        }
      },
      borderRadius: {
        'mars-sm': 'var(--mars-radius-sm, 4px)',
        'mars-md': 'var(--mars-radius-md, 8px)',
        'mars-lg': 'var(--mars-radius-lg, 12px)',
        'mars-xl': 'var(--mars-radius-xl, 16px)',
      },
      transitionDuration: {
        'mars-fast': 'var(--mars-duration-fast, 150ms)',
        'mars-normal': 'var(--mars-duration-normal, 250ms)',
        'mars-slow': 'var(--mars-duration-slow, 400ms)',
      },
    },
  },
  plugins: [],
}
