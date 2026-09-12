import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

const execAsync = promisify(exec);

// Keep YAML external so the managed app owns the pinned parser dependency.
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
