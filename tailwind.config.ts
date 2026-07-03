import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0F19",
        card: "#111827",
        primary: "#10B981",
        secondary: "#3B82F6",
        foreground: "#F9FAFB",
        muted: "#9CA3AF",
        border: "#1F2937"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"]
      },
      boxShadow: {
        soft: "0 10px 35px rgba(15, 23, 42, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
