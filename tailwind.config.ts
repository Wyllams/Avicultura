import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        manrope: ["var(--font-manrope)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        background: "#f8f9fa",
        foreground: "#191c1d",
        primary: {
          DEFAULT: "#004522",
          container: "#1a5e35",
          fixed: "#adf2bc",
          "fixed-dim": "#92d6a2",
        },
        on: {
          background: "#191c1d",
          primary: "#ffffff",
          "primary-container": "#91d5a1",
          surface: "#191c1d",
          "surface-variant": "#404941",
        },
        secondary: {
          DEFAULT: "#4b6450",
          container: "#cdead0",
        },
        tertiary: {
          DEFAULT: "#662630",
          container: "#833c46",
        },
        surface: {
          DEFAULT: "#f8f9fa",
          dim: "#d9dadb",
          bright: "#f8f9fa",
          container: "#edeeef",
          "container-low": "#f3f4f5",
          "container-lowest": "#ffffff",
          "container-high": "#e7e8e9",
          "container-highest": "#e1e3e4",
        },
        outline: {
          DEFAULT: "#707970",
          variant: "#c0c9be",
        },
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
