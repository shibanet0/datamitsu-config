import { execSync } from "node:child_process";
import { defineConfig } from "tsdown";

export default defineConfig({
  // The declarations come from `tsc --emitDeclarationOnly` in the hook below, which overwrites
  // whatever tsdown would write. tsdown otherwise turns its own declaration pass on because the
  // package's `exports` carry `types`, and since 0.23 that pass also splits rolldown's runtime
  // helpers into a shared `dist/rolldown-runtime-*.js` chunk.
  dts: false,
  entry: [
    "src/s0/index.ts",
    "src/apps/knip/index.ts",
    "src/datamitsu-api/index.ts",
    "src/type-fest/index.ts",
    "src/type-fest/globals/index.ts",
  ],
  fixedExtension: false,
  hooks: {
    "build:done": () => {
      execSync("rm -f tsconfig.tsbuildinfo && pnpm exec tsc --emitDeclarationOnly", {
        stdio: "inherit",
      });
    },
  },
});
