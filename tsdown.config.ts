import { execSync } from "node:child_process";
import { defineConfig } from "tsdown";

export default defineConfig({
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
