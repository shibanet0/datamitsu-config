import { execFileSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [distPath, tsPath] = process.argv.slice(2);

if (!distPath || !tsPath) {
  console.error("Usage: node scripts/bundle-dist-inline.ts <dist-dir> <output.ts>");
  process.exit(1);
}

const resolvedDist = resolve(distPath);
const resolvedTs = resolve(tsPath);

if (!existsSync(resolvedDist) || !statSync(resolvedDist).isDirectory()) {
  console.error(`Error: "${resolvedDist}" is not a directory`);
  process.exit(1);
}

// Use pnpm dm devtools pack-inline-archive command (silent mode to suppress pnpm output)
const base64 = execFileSync(
  "pnpm",
  ["--silent", "dm", "devtools", "pack-inline-archive", resolvedDist],
  {
    maxBuffer: 256 * 1024 * 1024,
  },
)
  .toString("utf8")
  .trim();

writeFileSync(resolvedTs, `// prettier-ignore\nexport const data = "${base64}";\n`);

const kb = ((base64.length * 0.75) / 1024).toFixed(1);
console.log(`Packed ${resolvedDist} → ${resolvedTs} (≈${kb} KB compressed)`);
