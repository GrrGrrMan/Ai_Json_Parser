/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#09090b",
          panel: "#121215",
          card: "#18181b",
          hover: "#202024",
          input: "#121215",
          border: "rgba(255, 255, 255, 0.08)",
          "border-medium": "rgba(255, 255, 255, 0.14)",
          accent: "#6366f1",
          "accent-hover": "#4f46e5",
          emerald: "#10b981",
          rose: "#f43f5e",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};