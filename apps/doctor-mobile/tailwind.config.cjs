/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "../../packages/mobile-ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [
    require("nativewind/preset"),
    require("@startup/mobile-ui/nativewind-preset"),
  ],
  plugins: [],
};
