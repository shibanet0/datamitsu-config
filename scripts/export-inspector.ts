/**
 * Exports the published configuration through `datamitsu inspect`: the self-contained HTML atlas
 * and the inspector manifest it embeds.
 *
 * The docs build puts both under `site/`, so the atlas is served next to the documentation and
 * never enters git. The release attaches the manifest to the GitHub Release, where the datamitsu
 * showcase reads a configuration's runtime composition from
 * `releases/latest/download/datamitsu-inspector-manifest.json`.
 *
 * It inspects the built baseline alone (`--no-auto-config`): the root `datamitsu.config.ts` layers
 * this repository's own managed-file overrides, which is not what a consumer inherits.
 *
 * Usage: node scripts/export-inspector.ts [--out-dir site] (requires `task build` first)
 */

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Linked as `/atlas`: GitHub Pages serves `atlas.html` for the extensionless path. A file actually
// named without an extension would be served as octet-stream and downloaded instead of opened.
export const ATLAS_FILE = "atlas.html";
export const MANIFEST_FILE = "datamitsu-inspector-manifest.json";

const MANIFEST_ELEMENT =
  /<script type="application\/json" id="inspector-manifest">([\s\S]*?)<\/script>/g;

interface InspectorManifest {
  apps: unknown[];
  schemaVersion: number;
}

/**
 * The manifest is the one inert JSON element the artifact carries; datamitsu has no flag that
 * writes it on its own. Returned verbatim, so the published file is byte-identical to what the
 * atlas's own **Dataset** button downloads.
 */
export function extractManifest(html: string): string {
  const matches = [...html.matchAll(MANIFEST_ELEMENT)];
  if (matches.length !== 1) {
    throw new Error(
      `expected exactly one inspector-manifest element in the atlas, found ${matches.length}`,
    );
  }
  const body = matches[0]![1]!;
  const manifest = JSON.parse(body) as Partial<InspectorManifest>;
  if (!Array.isArray(manifest.apps) || typeof manifest.schemaVersion !== "number") {
    throw new TypeError("the inspector-manifest element is not a datamitsu inspector manifest");
  }
  return body;
}

function main(): void {
  const args = process.argv.slice(2);
  const index = args.indexOf("--out-dir");
  const outDir = resolve(index === -1 ? "site" : (args[index + 1] ?? "site"));

  if (!existsSync("datamitsu.config.base.js")) {
    throw new Error("datamitsu.config.base.js is missing — run `task build` first");
  }
  mkdirSync(outDir, { recursive: true });

  const atlasPath = join(outDir, ATLAS_FILE);
  execFileSync(
    process.execPath,
    ["bin/datamitsu.js", "--no-auto-config", "inspect", "--output", atlasPath],
    { stdio: "inherit" },
  );
  // datamitsu writes the export 0600; a static host serves it to everyone.
  chmodSync(atlasPath, 0o644);

  const manifestPath = join(outDir, MANIFEST_FILE);
  writeFileSync(manifestPath, extractManifest(readFileSync(atlasPath, "utf8")));
  console.log(`Wrote ${atlasPath}\nWrote ${manifestPath}`);
}

if (import.meta.main) {
  main();
}
