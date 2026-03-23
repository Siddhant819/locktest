/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0a0e1a',
          card: '#0f1629',
          border: '#1e3a5f',
          blue: '#00d4ff',
          'blue-dim': '#0099bb',
          green: '#00ff88',
          red: '#ff3366',
          yellow: '#ffcc00',
          text: '#c8d8e8',
        },
      },
      boxShadow: {
        neon: '0 0 20px rgba(0, 212, 255, 0.3)',
        'neon-green': '0 0 20px rgba(0, 255, 136, 0.3)',
        'neon-red': '0 0 20px rgba(255, 51, 102, 0.3)',
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, #0a0e1a 0%, #0f1629 50%, #0a1628 100%)',
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}
