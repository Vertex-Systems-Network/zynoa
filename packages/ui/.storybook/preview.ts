import type { Preview } from "@storybook/react-vite";
import "./preview.css";

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: "Color theme",
      toolbar: { title: "Theme", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (story, context) => {
      // tokens.css theme contract: data-theme on the root element.
      document.documentElement.setAttribute("data-theme", String(context.globals.theme));
      return story();
    },
  ],
};

export default preview;
