import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

const execAsync = promisify(exec);

// The lefthook-sort script runs under plain `node` (invoked by a lefthook job).
// It is bundled as an ESM .mjs so node always loads it as a module regardless of
// the app dir's package type, with `yaml` kept external — it is installed as the
// app's main package and resolved from the app's node_modules at runtime.
export default defineConfig({
  dts: false,
  entry: ["src/apps/lefthook-sort/index.ts"],
  external: ["yaml"],
  fixedExtension: true,
  format: ["esm"],
  hooks: {
    "build:done": async () => {
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-lefthook-sort-config src/datamitsu-config/inline-config/lefthook-sort.ts",
      );
    },
  },
  outDir: "dist-inline-lefthook-sort-config",
  platform: "node",
});
