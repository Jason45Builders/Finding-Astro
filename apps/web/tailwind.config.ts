import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1A6B4A",
          light: "#E8F5EE",
        },
        accent: {
          DEFAULT: "#E85D26",
        },
      },
    },
  },
  plugins: [],
};
export default config;
