import { spawn, spawnSync } from "node:child_process";
import fsPromise from "node:fs/promises";
import { resolve } from "node:path";

import { minReleaseAgeCutoff } from "./pull-external-apps.ts";

export interface CatalogPattern {
  fileMatch: string[];
  id: string;
}

export interface CatalogPin {
  digest: string;
  globs: string[];
  repository: string;
  revision: string;
  /**
   * Schemas the validator cannot compile, with its first error. Their patterns are left out of
   * `globs`, so a file only they match never reaches the validator and cannot fail the run on a
   * defect of the schema.
   */
  unusable: Record<string, string>;
  /**
   * The `jsonschema` version the schemas were compiled with: a validator bump changes which of them
   * compile, so the globs are only valid for this version.
   */
  validator: string;
}

interface ManagedApp {
  args: string[];
  command: string;
  env: NodeJS.ProcessEnv;
}

interface RunResult {
  code: null | number;
  stderr: string;
  stdout: string;
}

/**
 * Catalog IDs whose `.json` files their own tool reads with comments and trailing commas. The
 * Sourcemeta validator parses strict JSON only, so it would reject a valid config as unparsable.
 * Their YAML patterns are kept. An ID the catalog no longer has fails the pull, because a renamed
 * one would silently start handing JSONC files to the validator again.
 */
export const JSONC_SCHEMA_IDS: readonly string[] = [
  "babelrc",
  // deno.json
  "config-file.v1",
  // .oxfmtrc.json
  "configuration_schema",
  // .oxlintrc.json
  "configuration_schema-raw-githubusercontent-com",
  "eslintrc",
  "jsconfig",
  "markdownlint-config-schema",
  "mocharc",
  "tsconfig",
  "tslint",
];

const CATALOG_TAG = /^catalog-(\d{4})(\d{2})(\d{2})\.(\d{2})(\d{2})$/;

/**
 * The formats `jsonschema validate` reads. Anything else — TOML, JSON5, JSONC, a name without an
 * extension — would be reported as a parse failure of a perfectly valid file.
 */
const VALIDATOR_FORMATS = /\.(json|ya?ml)$/;

const COMPILE_CONCURRENCY = 8;

const root = resolve(import.meta.dirname, "..");

/**
 * The positive, validator-readable patterns of every usable schema as workspace-relative globs,
 * translated the way schepherd's integration guide describes. Negative patterns are dropped: they
 * exclude a file from their own schema only, which `run --ignore-unmatched` already honors.
 */
export function buildGlobs(patterns: CatalogPattern[], unusable: Record<string, string>): string[] {
  const globs = new Set<string>();
  for (const { fileMatch, id } of patterns) {
    if (id in unusable) {
      continue;
    }
    const jsonc = JSONC_SCHEMA_IDS.includes(id);
    for (const pattern of fileMatch) {
      const glob = toGlob(pattern);
      if (glob !== undefined && (!jsonc || !glob.endsWith(".json"))) {
        globs.add(glob);
      }
    }
  }
  return [...globs].toSorted();
}

/**
 * A catalog revision is the UTC minute of its publication, so the tag itself dates it.
 */
export function parseCatalogTag(tag: string): Date | undefined {
  const match = CATALOG_TAG.exec(tag);
  if (!match) {
    return undefined;
  }
  const [, year, month, day, hour, minute] = match.map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!));
}

/**
 * The newest `catalog-YYYYMMDD.HHMM` tag published before the cutoff. `catalog-latest` is the one
 * mutable tag and is never selected: a pin names a revision.
 */
export function selectCatalogTag(tags: string[], cutoff: Date | undefined): string | undefined {
  return tags
    .filter((tag) => {
      const published = parseCatalogTag(tag);
      return published !== undefined && (cutoff === undefined || published <= cutoff);
    })
    .toSorted()
    .at(-1);
}

export function toGlob(pattern: string): string | undefined {
  if (pattern.startsWith("!") || !VALIDATOR_FORMATS.test(pattern)) {
    return undefined;
  }
  if (/^\.?\//.test(pattern)) {
    return pattern.replace(/^\.?\//, "");
  }
  return pattern.includes("/") ? pattern : `**/${pattern}`;
}

function describeDrift(recorded: Partial<CatalogPin>, next: CatalogPin): string[] {
  const lines: string[] = [];
  for (const key of ["repository", "revision", "digest", "validator"] as const) {
    if (recorded[key] !== next[key]) {
      lines.push(`${key}: ${recorded[key] ?? "(none)"} -> ${next[key]}`);
    }
  }
  const recordedGlobs = new Set(recorded.globs ?? []);
  const nextGlobs = new Set(next.globs);
  const added = next.globs.filter((glob) => !recordedGlobs.has(glob));
  const removed = [...recordedGlobs].filter((glob) => !nextGlobs.has(glob));
  if (added.length > 0 || removed.length > 0) {
    lines.push(`globs: +${added.length} -${removed.length}`);
  }
  const recordedUnusable = recorded.unusable ?? {};
  for (const id of Object.keys({ ...recordedUnusable, ...next.unusable }).toSorted()) {
    if (recordedUnusable[id] !== next.unusable[id]) {
      lines.push(
        next.unusable[id] === undefined
          ? `unusable: ${id} compiles now`
          : `unusable: ${id}: ${next.unusable[id]}`,
      );
    }
  }
  return lines;
}

function dmExec(app: string, args: string[]): string {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "bin/datamitsu.js"), "exec", app, "--", ...args],
    { cwd: root, encoding: "utf8", maxBuffer: 64 << 20 },
  );
  if (result.status !== 0) {
    throw new Error(`${app} ${args.join(" ")} exited with ${result.status}:\n${result.stderr}`);
  }
  return result.stdout;
}

async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  const update = arguments_.includes("--update");
  const registryPath = arguments_.find((a) => !a.startsWith("--"));

  if (!registryPath) {
    console.error("Usage: pull-schepherd-catalog.ts [--update] <path-to-schepherdCatalog.json>");
    process.exit(1);
  }

  const recorded = JSON.parse(
    await fsPromise.readFile(registryPath, "utf8"),
  ) as Partial<CatalogPin> & Pick<CatalogPin, "repository">;

  let reference = `${recorded.repository}@${recorded.digest}`;
  if (update) {
    const cutoff = minReleaseAgeCutoff(process.env.DATAMITSU_MIN_RELEASE_AGE, new Date());
    console.log(
      cutoff
        ? `Minimum release age: catalogs published before ${cutoff.toISOString()}`
        : "Minimum release age: disabled",
    );
    const tags = dmExec("crane", ["ls", recorded.repository]).split("\n");
    const tag = selectCatalogTag(tags, cutoff);
    if (tag === undefined) {
      if (!recorded.digest) {
        throw new Error(`${recorded.repository}: no catalog is old enough to pin`);
      }
      console.warn(
        `${recorded.repository}: no newer catalog is old enough; keeping ${recorded.revision}`,
      );
    } else {
      reference = `${recorded.repository}:${tag}`;
    }
  }

  const pin = JSON.parse(dmExec("schepherd", ["--quiet", "pin", reference, "--json"])) as {
    digest: string;
    repository: string;
    revision: string;
    schemas: number;
  };
  if (!update && pin.revision !== recorded.revision) {
    throw new Error(
      `${reference} is revision ${pin.revision}, the registry records ${recorded.revision}`,
    );
  }
  console.log(`${pin.repository}: revision ${pin.revision}, ${pin.schemas} schemas, ${pin.digest}`);

  const validator = dmExec("jsonschema", ["version"]).trim();
  const schepherd = managedApp("schepherd");
  const catalogArgs = ["--quiet", "--repository", pin.repository, "--catalog", pin.digest];
  const patternsResult = await run(
    schepherd.command,
    [...schepherd.args, ...catalogArgs, "patterns", "--json"],
    schepherd.env,
    true,
  );
  if (patternsResult.code !== 0) {
    throw new Error(
      `schepherd patterns exited with ${patternsResult.code}:\n${patternsResult.stderr}`,
    );
  }
  const patterns = JSON.parse(patternsResult.stdout) as CatalogPattern[];

  const missing = JSONC_SCHEMA_IDS.filter((id) => patterns.every((entry) => entry.id !== id));
  if (missing.length > 0) {
    throw new Error(
      `the catalog no longer has JSONC schema IDs ${missing.join(", ")}; update JSONC_SCHEMA_IDS`,
    );
  }

  console.log(`Compiling ${patterns.length} schemas with jsonschema ${validator}...`);
  const unusable = await unusableSchemas(
    schepherd,
    catalogArgs,
    patterns.map((entry) => entry.id),
  );

  const next: CatalogPin = {
    digest: pin.digest,
    globs: buildGlobs(patterns, unusable),
    repository: pin.repository,
    revision: pin.revision,
    unusable,
    validator,
  };
  console.log(
    `${next.globs.length} globs from ${patterns.length - Object.keys(unusable).length} schemas; ${Object.keys(unusable).length} do not compile`,
  );

  const drift = describeDrift(recorded, next);
  if (drift.length === 0) {
    console.log("The recorded catalog pin is current; nothing to write.");
    return;
  }
  for (const line of drift) {
    console.log(`  ${line}`);
  }
  if (!update) {
    console.error("\nThe recorded catalog pin has drifted; run `task pull:external:update`.");
    process.exit(1);
  }
  await fsPromise.writeFile(registryPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log("Catalog pin updated.");
}

/**
 * The installed schepherd with its runtime environment — `JSONSCHEMA_BIN` included — so the
 * per-schema calls below skip datamitsu's start-up, which dominates nine hundred short processes.
 */
function managedApp(name: string): ManagedApp {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "bin/datamitsu.js"), "source", "status", "--json"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 << 20 },
  );
  if (result.status !== 0) {
    throw new Error(`datamitsu source status failed:\n${result.stderr}`);
  }
  const status = JSON.parse(result.stdout) as {
    entries: {
      args?: string[];
      command: string;
      env?: NodeJS.ProcessEnv;
      installed: boolean;
      name: string;
    }[];
  };
  const app = status.entries.find((entry) => entry.name === name);
  if (!app?.installed) {
    throw new Error(`${name} is not installed; run \`pnpm dm exec ${name} -- version\``);
  }
  // Another catalog must not write into this release's prepared state.
  const environment = { ...app.env };
  delete environment.SCHEPHERD_CACHE_DIR;
  return { args: app.args ?? [], command: app.command, env: { ...process.env, ...environment } };
}

async function mapConcurrently<T, R>(
  items: T[],
  limit: number,
  callback: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await callback(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  keepStdout: boolean,
): Promise<RunResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ["ignore", keepStdout ? "pipe" : "ignore", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolvePromise({ code, stderr, stdout }));
  });
}

async function unusableSchemas(
  schepherd: ManagedApp,
  catalogArgs: string[],
  ids: string[],
): Promise<Record<string, string>> {
  const validator = schepherd.env.JSONSCHEMA_BIN;
  if (!validator) {
    throw new Error("schepherd's runtime environment carries no JSONSCHEMA_BIN");
  }
  const reasons = await mapConcurrently(ids, COMPILE_CONCURRENCY, async (id) => {
    const path = await run(
      schepherd.command,
      [...schepherd.args, ...catalogArgs, "path", id],
      schepherd.env,
      true,
    );
    if (path.code !== 0) {
      throw new Error(`schepherd path ${id} exited with ${path.code}:\n${path.stderr}`);
    }
    const compiled = await run(validator, ["compile", path.stdout.trim()], schepherd.env, false);
    if (compiled.code === 0) {
      return undefined;
    }
    const message = /^error: (.*)$/m.exec(compiled.stderr)?.[1] ?? `exit ${compiled.code}`;
    return `does not compile: ${message}`;
  });
  return Object.fromEntries(
    ids.flatMap((id, index) => (reasons[index] === undefined ? [] : [[id, reasons[index]]])),
  );
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/pull-schepherd-catalog.ts");

if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}
