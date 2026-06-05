import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

import { tsdownConfigBanner } from "./tsdown.config-banner";

const execAsync = promisify(exec);

export default defineConfig({
  dts: true,
  entry: ["src/apps/oxfmt/index.ts"],
  external: ["oxfmt"],
  fixedExtension: false,
  hooks: {
    "build:done": async () => {
      await execAsync("node ./scripts/inject-jsdoc.ts dist-inline-oxfmt-config");
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-oxfmt-config src/datamitsu-config/inline-config/oxfmt.ts",
      );
    },
  },
  outDir: "dist-inline-oxfmt-config",
  outputOptions: {
    banner: tsdownConfigBanner,
  },
});
