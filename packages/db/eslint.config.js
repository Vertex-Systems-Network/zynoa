import shared from "@zynoa/config/eslint";

export default [
  ...shared,
  {
    // Inside the db package the schema is the implementation, not a shortcut around it.
    rules: { "no-restricted-imports": "off" },
  },
];
