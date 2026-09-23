import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

import { stylelintDeps } from "./src/datamitsu-config/apps/stylelint.deps";
import { tsdownConfigBanner } from "./tsdown.config-banner";

const execAsync = promisify(exec);

export default defineConfig({
  dts: true,
  entry: ["src/apps/stylelint/index.ts"],
  external: Object.keys(stylelintDeps),
  fixedExtension: false,
  hooks: {
    "build:done": async () => {
      await execAsync("node ./scripts/inject-jsdoc.ts dist-inline-stylelint-config");
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-stylelint-config src/datamitsu-config/inline-config/stylelint.ts",
      );
    },
  },
  outDir: "dist-inline-stylelint-config",
  outputOptions: {
    banner: tsdownConfigBanner,
  },
});
