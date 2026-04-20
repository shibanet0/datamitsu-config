import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "tsdown";

const execAsync = promisify(exec);

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
    "build:done": async () => {
      await execAsync("rm -f tsconfig.tsbuildinfo && pnpm exec tsc --emitDeclarationOnly");
    },
  },
});
