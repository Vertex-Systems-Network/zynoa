import shared from "@zynoa/config/eslint";

export default [
  ...shared,
  {
    // Like packages/db, this package IS the layer the restriction protects:
    // Better Auth's schema mapping and sign-up provisioning write the identity/
    // workspace tables directly, on the platform role, in one transaction
    // (spec 05 §2-3). Everything else keeps importing @zynoa/db repositories.
    rules: { "no-restricted-imports": "off" },
  },
];
