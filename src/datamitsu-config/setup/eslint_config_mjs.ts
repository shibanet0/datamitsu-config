export const eslintConfigMjs: config.ConfigSetup = {
  content: (context) => {
    // No `oxlint.configFilePath`. It used to point eslint-plugin-oxlint at the project's own
    // `.oxlintrc.json`, which is a file that only ever said `extends` — and the plugin does not
    // follow `extends`, so it read an empty rule set and suppressed 76 ESLint rules where the real
    // config suppresses 304. Every one of the other 228 was a rule both tools were reporting.
    // `defineConfig` now uses the shared config object directly, which is also the only thing that
    // still works now that the oxlint config is a TypeScript module.
    return `import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "eslint.config.mjs"))}";

import packageJSON from "./package.json" with { type: "json" };

export default await defineConfig(
  /** @type {import("${facts().env.DATAMITSU_PACKAGE_NAME}/type-fest").PackageJson} */ (packageJSON),
);
`;
  },
  otherFileNameList: [
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
    "eslint.config.ts",
    "eslint.config.mts",
    "eslint.config.cts",
    // deprecated
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.yaml",
    ".eslintrc.yml",
    ".eslintrc.json",
  ],
  projectTypes: ["npm-package"],
  tools: ["eslint"],
};
