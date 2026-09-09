import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

import { tsdownConfigBanner } from "./tsdown.config-banner";

const execAsync = promisify(exec);

export default defineConfig({
  dts: true,
  entry: ["src/apps/oxlint/index.ts"],
  fixedExtension: false,
  hooks: {
    "build:done": async () => {
      await execAsync("node ./scripts/inject-jsdoc.ts dist-inline-oxlint-config");
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-oxlint-config src/datamitsu-config/inline-config/oxlint.ts",
      );
    },
  },
  outDir: "dist-inline-oxlint-config",
  outputOptions: {
    banner: tsdownConfigBanner,
  },
});
