import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

const execAsync = promisify(exec);

export default defineConfig({
  dts: false,
  entry: ["src/apps/lefthook-proxy/index.ts"],
  fixedExtension: true,
  format: ["esm"],
  hooks: {
    "build:done": async () => {
      await execAsync(
        "node ./scripts/bundle-dist-inline.ts dist-inline-lefthook-proxy-config src/datamitsu-config/inline-config/lefthook-proxy.ts",
      );
    },
  },
  outDir: "dist-inline-lefthook-proxy-config",
  platform: "node",
});
