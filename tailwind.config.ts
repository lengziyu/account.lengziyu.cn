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
        brandIndigo: "#5e6ad2",
        accentViolet: "#7170ff",
        accentHover: "#828fff",
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
  plugins: [],
};
export default config;
