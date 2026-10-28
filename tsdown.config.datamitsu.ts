import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "tsdown";

import { resolveDatamitsuConfigVersion } from "./scripts/config-version";
import { tsdownConfigBanner } from "./tsdown.config-banner";

const datamitsuConfigVersion = resolveDatamitsuConfigVersion();
export default defineConfig({
  define: {
    __DATAMITSU_CONFIG_VERSION__: JSON.stringify(datamitsuConfigVersion),
  },
  entry: { "datamitsu.config": "src/datamitsu-config/datamitsu-config.ts" },
  fixedExtension: false,
  hooks: {
    "build:done": () => {
      const outFile = resolve("dist-datamitsu-config/datamitsu.config.js");
      const content = readFileSync(outFile, "utf8");
      writeFileSync(outFile, content.replace(/^export \{\};\s*$/m, ""), "utf8");
    },
  },
  outDir: "dist-datamitsu-config",
  outputOptions: {
    banner: tsdownConfigBanner,
  },
});
