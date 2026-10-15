/** Tailwind v3 config for Storybook; colors/spacing/radii come from the tokens preset. */
module.exports = {
  presets: [require("@zynoa/tokens/tailwind.preset")],
  content: ["./src/**/*.{ts,tsx}", "./stories/**/*.{ts,tsx}"],
};
