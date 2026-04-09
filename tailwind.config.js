/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#e8f55a",
        bg: "#0c0c0e",
        surface: "#141416",
        surface2: "#1c1c20",
        border: "#2a2a30",
        textMuted: "#6b6b78",
        textDim: "#3a3a44",
      },
      fontFamily: {
        mono: ['"DM Mono"', "monospace"],
        sans: ["Syne", "sans-serif"],
      },
    },
  },
  plugins: [],
}
