/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bubblegum: "#ff6fa3",
        sunshine: "#ffd23f",
        babyblue: "#3ec1ff",
        grass: "#7ed957",
        grape: "#8b5cf6",
      },
      fontFamily: {
        rounded: ["Rubik", "Nunito", "system-ui", "sans-serif"],
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        wiggle: "wiggle 0.5s ease-in-out infinite",
        pulseRing: "pulseRing 1.2s ease-out infinite",
      },
    },
  },
  plugins: [],
};
