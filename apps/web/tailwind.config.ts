import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        atlas: {
          bg: "#0B0F14",
          panel: "#111820",
          elevated: "#17212B",
          text: "#F1F5F9",
          muted: "#94A3B8",
          accent: "#49A5F6",
          positive: "#34D399",
          warning: "#FBBF24",
          negative: "#F87171",
          border: "#1E293B",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
