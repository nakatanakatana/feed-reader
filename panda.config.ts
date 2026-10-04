import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],

  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: [
    "./frontend/src/**/*.{js,jsx,ts,tsx}",
    "./frontend/pages/**/*.{js,jsx,ts,tsx}",
  ],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {
      breakpoints: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
        xs: "480px",
        itemDetailModal: "960px",
      },
    },
  },

  // The output directory for your css system
  outdir: "frontend/styled-system",
});
