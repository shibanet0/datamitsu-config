import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

import { commitlintDeps } from "./src/datamitsu-config/apps/commitlint.deps";
import { tsdownConfigBanner } from "./tsdown.config-banner";

const execAsync = promisify(exec);

export default defineConfig({
  dts: true,
  entry: ["src/apps/commitlint/index.ts"],
  external: Object.keys(commitlintDeps),
  fixedExtension: false,
  hooks: {
    "build:done": async () => {
      await execAsync("node ./scripts/inject-jsdoc.ts dist-inline-commitlint-config");
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-commitlint-config src/datamitsu-config/inline-config/commitlint.ts",
      );
    },
  },
  outDir: "dist-inline-commitlint-config",
  outputOptions: {
    banner: tsdownConfigBanner,
  },
});
