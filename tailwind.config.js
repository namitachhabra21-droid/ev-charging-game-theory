/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stationA: "#2a78d6",
        stationB: "#eb6834",
        ink: { DEFAULT: "#0b0b0b", 2: "#52514e", muted: "#898781" },
        surface: "#fcfcfb",
        plane: "#f9f9f7",
        hairline: "#e1e0d9",
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
