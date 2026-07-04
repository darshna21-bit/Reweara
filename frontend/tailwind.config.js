/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cream: '#FCF9F6',      // Base background, warm and warm-toned luxury
          blush: '#E8C5C8',      // Primary branding, soft feminine rose
          gold: '#D4AF37',       // Secondary highlights and accents, champagne gold
          espresso: '#2B2321',   // Primary text color, avoids the harshness of pure black
          dust: '#8E7E7A',       // Subtitles, descriptive text, borders
          sage: '#C8D6C5',       // Success state badge or tertiary accent
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        'luxury': '12px',        // Soft premium rounding for card blocks
        'soft': '8px',          // Micro-elements like buttons
      }
    },
  },
  plugins: [],
}
