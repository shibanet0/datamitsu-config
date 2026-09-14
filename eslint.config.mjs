import { globalIgnores } from "@eslint/config-helpers";

import { defineConfig } from "./.datamitsu/eslint.config.mjs";
import packageJSON from "./package.json" with { type: "json" };

const config = await defineConfig(
  /**
   * @type {import("./dist/type-fest").PackageJson}
   */ (packageJSON),
  undefined,
  {
    plugins: {
      e18e: {
        disabled: true,
      },
      react: {
        version: "19.2.3",
      },
    },
    react: true,
  },
);

export default [globalIgnores([".datamitsu/", "dist-*/"]), ...config];
