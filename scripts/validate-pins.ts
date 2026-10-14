/**
 * Fails when the dependency literal inside the root `datamitsu.config.ts` has drifted from the
 * `package.json` it manages.
 *
 * The root config restates every dependency and version — around ninety literals — because that is
 * how a datamitsu-managed `package.json` is declared. Nothing kept the two equal. `pull:node`
 * updates the registry and the manifest; `sync:datamitsu-version` keeps exactly one entry aligned,
 * `@datamitsu/datamitsu`, and leaves the rest.
 *
 * Latent rather than live: the literal is only applied by `datamitsu config reconcile`, which
 * AGENTS.md forbids in this repository. That is precisely what makes it worth a gate — drift
 * accumulates unobserved, and the day someone does run setup it silently reverts however many bumps
 * have landed since. It is already drifted today.
 *
 *     node scripts/validate-pins.ts    fail if the literal and package.json disagree
 */
import fsPromise from "node:fs/promises";
import path from "node:path";

import { readPackageLiteral } from "./lib/package-literal.ts";

const repoRoot = path.join(import.meta.dirname, "..");

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies"] as const;

const manifest = JSON.parse(
  await fsPromise.readFile(path.join(repoRoot, "package.json"), "utf8"),
) as Record<string, Record<string, string> | undefined>;

const source = await fsPromise.readFile(path.join(repoRoot, "datamitsu.config.ts"), "utf8");

const literal = readPackageLiteral(source);

let failed = false;

for (const field of DEPENDENCY_FIELDS) {
  const declared = literal[field] ?? {};
  const actual = manifest[field] ?? {};

  const missing = Object.keys(actual).filter((name) => !(name in declared));
  const extra = Object.keys(declared).filter((name) => !(name in actual));
  const mismatched = Object.keys(actual).filter(
    (name) => name in declared && declared[name] !== actual[name],
  );

  if (missing.length + extra.length + mismatched.length === 0) {
    continue;
  }

  failed = true;
  process.stdout.write(`\n${field}\n${"─".repeat(72)}\n`);

  for (const name of missing) {
    process.stdout.write(`  missing from the literal   ${name}@${actual[name]}\n`);
  }
  for (const name of extra) {
    process.stdout.write(`  not in package.json        ${name}@${declared[name]}\n`);
  }
  for (const name of mismatched) {
    process.stdout.write(
      `  version disagrees          ${name}: literal ${declared[name]}, manifest ${actual[name]}\n`,
    );
  }
}

/**
 * `packageManager` is one string rather than a map, and just as unguarded: `pull:node` writes the
 * manifest's, and the literal went on saying pnpm 12.4.1 after the manifest had moved to 12.5.1.
 */
const declaredPackageManager = literal.packageManager;
const actualPackageManager = (manifest as Record<string, unknown>)["packageManager"];

if (declaredPackageManager !== actualPackageManager) {
  failed = true;
  process.stdout.write(
    `\npackageManager\n${"─".repeat(72)}\n` +
      `  version disagrees          literal ${declaredPackageManager}, manifest ${String(actualPackageManager)}\n`,
  );
}

if (failed) {
  process.stdout.write(
    "\nThe dependency literal in datamitsu.config.ts manages package.json, so a disagreement\n" +
      "means `datamitsu config reconcile` would revert the manifest to whatever the literal says.\n" +
      "Copy the manifest's versions into the literal.\n",
  );
  process.exit(1);
}

process.stdout.write("pins: datamitsu.config.ts matches package.json\n");
