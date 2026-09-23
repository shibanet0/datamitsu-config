import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

const execAsync = promisify(exec);

// Keep YAML external so the managed app owns the pinned parser dependency.
export default defineConfig({
  dts: false,
  entry: ["src/apps/sort-keys/index.ts"],
  external: ["yaml"],
  fixedExtension: true,
  format: ["esm"],
  hooks: {
    "build:done": async () => {
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-sort-keys-config src/datamitsu-config/inline-config/sort-keys.ts",
      );
    },
  },
  outDir: "dist-inline-sort-keys-config",
  platform: "node",
});
