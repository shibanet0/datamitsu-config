import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

import { prettierDeps } from "./src/datamitsu-config/apps/prettier.deps";
import { tsdownConfigBanner } from "./tsdown.config-banner";

const execAsync = promisify(exec);

export default defineConfig({
  dts: true,
  entry: ["src/apps/prettier/index.ts"],
  external: Object.keys(prettierDeps),
  fixedExtension: false,
  hooks: {
    "build:done": async () => {
      await execAsync("node ./scripts/inject-jsdoc.ts dist-inline-prettier-config");
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-prettier-config src/datamitsu-config/inline-config/prettier.ts",
      );
    },
  },
  outDir: "dist-inline-prettier-config",
  outputOptions: {
    banner: tsdownConfigBanner,
  },
});
