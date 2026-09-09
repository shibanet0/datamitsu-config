/**
 * Fails when the dependency literal inside the root `datamitsu.config.ts` has drifted from the
 * `package.json` it manages.
 *
 * The root config restates every dependency and version — around ninety literals — because that is
 * how a datamitsu-managed `package.json` is declared. Nothing kept the two equal. `pull:node`
 * updates the registry and the manifest; `sync:datamitsu-version` keeps exactly one entry aligned,
 * `@datamitsu/datamitsu`, and leaves the rest.
 *
 * Latent rather than live: the literal is only applied by `datamitsu setup`, which AGENTS.md
 * forbids in this repository. That is precisely what makes it worth a gate — drift accumulates
 * unobserved, and the day someone does run setup it silently reverts however many bumps have landed
 * since. It is already drifted today.
 *
 *     node scripts/validate-pins.ts    fail if the literal and package.json disagree
 */
import fsPromise from "node:fs/promises";
import path from "node:path";

const repoRoot = path.join(import.meta.dirname, "..");

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies"] as const;

const manifest = JSON.parse(
  await fsPromise.readFile(path.join(repoRoot, "package.json"), "utf8"),
) as Record<string, Record<string, string> | undefined>;

const source = await fsPromise.readFile(path.join(repoRoot, "datamitsu.config.ts"), "utf8");

/**
 * The literal is a TypeScript object inside a template of generated JSON, so it is read the way the
 * generators read their own output: by locating the field and parsing the balanced braces after it.
 * Importing the module instead would execute the whole config for two dozen strings.
 */
function readField(field: string): Record<string, string> | undefined {
  const start = source.indexOf(`\n              ${field}: {`);

  if (start === -1) {
    return undefined;
  }

  const open = source.indexOf("{", start);
  let depth = 0;
  let end = open;

  for (; end < source.length; end++) {
    if (source[end] === "{") depth++;
    if (source[end] === "}") depth--;
    if (depth === 0) break;
  }

  const body = source.slice(open + 1, end);
  const entries: Record<string, string> = {};

  for (const match of body.matchAll(/^\s*(?:"([^"]+)"|([\w$-]+)):\s*"([^"]+)",?\s*$/gm)) {
    entries[(match[1] ?? match[2]) as string] = match[3] as string;
  }

  return entries;
}

let failed = false;

for (const field of DEPENDENCY_FIELDS) {
  const declared = readField(field);
  const actual = manifest[field];

  if (!declared || !actual) {
    continue;
  }

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

if (failed) {
  process.stdout.write(
    "\nThe dependency literal in datamitsu.config.ts manages package.json, so a disagreement\n" +
      "means `datamitsu setup` would revert the manifest to whatever the literal says.\n" +
      "Copy the manifest's versions into the literal.\n",
  );
  process.exit(1);
}

process.stdout.write("pins: datamitsu.config.ts matches package.json\n");
