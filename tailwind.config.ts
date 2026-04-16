import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        marketingBlack: "#08090a",
        panelDark: "#0f1011",
        surface3: "#191a1b",
        surface2: "#28282c",
        textPrimary: "#f7f8f8",
        textSecondary: "#d0d6e0",
        textTertiary: "#8a8f98",
        textQuaternary: "#62666d",
        brandIndigo: "#a855f7", // Changed to purple-500
        accentViolet: "#c084fc", // Changed to purple-400
        accentHover: "#d8b4fe", // Changed to purple-300
        borderPrimary: "#23252a",
        borderSecondary: "#34343a",
        statusGreen: "#10b981",
      },
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Berkeley Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
  darkMode: "class",
};
export default config;
