import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

import { cspellDeps } from "./src/datamitsu-config/apps/cspell.deps";
import { tsdownConfigBanner } from "./tsdown.config-banner";

const execAsync = promisify(exec);

export default defineConfig({
  dts: true,
  entry: ["src/apps/cspell/index.ts"],
  external: Object.keys(cspellDeps),
  fixedExtension: false,
  hooks: {
    "build:done": async () => {
      await execAsync("node ./scripts/inject-jsdoc.ts dist-inline-cspell-config");
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-cspell-config src/datamitsu-config/inline-config/cspell.ts",
      );
    },
  },
  outDir: "dist-inline-cspell-config",
  outputOptions: {
    banner: tsdownConfigBanner,
  },
});
