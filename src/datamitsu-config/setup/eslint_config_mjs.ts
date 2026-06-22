import { env } from "../env";

export const eslintConfigMjs: config.ConfigSetup = {
  content: (context) => {
    if (env().DATAMITSU_DEV_MODE) {
      return `import { join } from "node:path";

import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "eslint.config.mjs"))}";
import packageJSON from "./package.json" with { type: "json" };

const config = await defineConfig(
  /**
   * @type {import("./dist/type-fest").PackageJson}
   */ (packageJSON),
  undefined,
  {
    plugins: {
      oxlint: {
        configFilePath: join(import.meta.dirname, ".oxlintrc.json"),
      },
      react: {
        version: "19.2.3",
      },
    },
    react: true,
  },
);

export default [
  ...config,
  {
    rules: {
      "playwright/no-standalone-expect": "off",
      "unicorn/no-object-as-default-parameter": "off",
    },
  },
];
`;
    }

    return `import { join } from "node:path";

  import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "eslint.config.mjs"))}";

  import packageJSON from "./package.json" with { type: "json" };

  const config = await defineConfig(
  /** @type {import("${facts().env.DATAMITSU_PACKAGE_NAME}/type-fest").PackageJson} */ (packageJSON),
  undefined,
  {
    plugins: {
      oxlint: {
        configFilePath: join(import.meta.dirname, ".oxlintrc.json"),
      },
    },
  },
);

export default config;
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
