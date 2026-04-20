import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

import { eslintDeps } from "./src/datamitsu-config/apps/eslint.deps";
import { tsdownConfigBanner } from "./tsdown.config-banner";

const execAsync = promisify(exec);

export default defineConfig({
  dts: true,
  entry: ["src/apps/eslint/index.ts"],
  external: Object.keys(eslintDeps),
  fixedExtension: false,
  hooks: {
    "build:done": async () => {
      await execAsync("node ./scripts/inject-jsdoc.ts dist-inline-eslint-config");
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-eslint-config src/datamitsu-config/inline-config/eslint.ts",
      );
    },
  },
  outDir: "dist-inline-eslint-config",
  outputOptions: {
    banner: tsdownConfigBanner,
  },
});
