import { exec } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

const execAsync = promisify(exec);

/**
 * Sort-keys ships inside this package and has no version of its own, so `--version` reports the
 * package's. The image build verifies every installed app by running it with `--version`, and a
 * binary that answers with an error there fails the build.
 */
const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

// Keep YAML external so the managed app owns the pinned parser dependency.
export default defineConfig({
  define: {
    __SORT_KEYS_VERSION__: JSON.stringify(version),
  },
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
