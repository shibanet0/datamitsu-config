import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

import { tsdownConfigBanner } from "./tsdown.config-banner";

const execAsync = promisify(exec);

export default defineConfig({
  dts: true,
  entry: ["src/apps/markdownlint-cli2/index.ts"],
  fixedExtension: false,
  hooks: {
    "build:done": async () => {
      await execAsync("node ./scripts/inject-jsdoc.ts dist-inline-markdownlint-cli2-config");
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-markdownlint-cli2-config src/datamitsu-config/inline-config/markdownlint-cli2.ts",
      );
    },
  },
  outDir: "dist-inline-markdownlint-cli2-config",
  outputOptions: {
    banner: tsdownConfigBanner,
  },
});
