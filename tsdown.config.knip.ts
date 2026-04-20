import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

import { tsdownConfigBanner } from "./tsdown.config-banner";

const execAsync = promisify(exec);

export default defineConfig({
  dts: true,
  entry: ["src/apps/knip/index.ts"],
  fixedExtension: false,
  hooks: {
    "build:done": async () => {
      await execAsync("node ./scripts/inject-jsdoc.ts dist-inline-knip-config");
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-knip-config src/datamitsu-config/inline-config/knip.ts",
      );
    },
  },
  outDir: "dist-inline-knip-config",
  outputOptions: {
    banner: tsdownConfigBanner,
  },
});
