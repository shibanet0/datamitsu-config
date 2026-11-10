import { spawn, spawnSync } from "node:child_process";
import fsPromise from "node:fs/promises";
import { resolve } from "node:path";

import { minReleaseAgeCutoffFromEnvironment } from "./pull-external-apps.ts";

export interface CatalogPattern {
  covering?: {
    excluded?: CoveringExclusion[];
    globs: string[];
    recordedExcluded?: { processor: string; reason: string }[];
    recordedSupported?: string[];
    validators: string[];
  };
  fileMatch: string[];
  id: string;
  metadata?: {
    profiles: {
      processor: string;
      reason?: string;
      result: "supported" | "unsupported";
      settingsDigest: string;
      tool: string;
    }[];
    schemaDigest: string;
  };
  sourceFormats?: { extensions: string[]; filenames: string[]; format: string }[];
}

export interface CatalogPin {
  covering?: Record<string, NonNullable<CatalogPattern["covering"]>>;
  digest: string;
  globs: string[];
  metadata?: Record<string, CatalogPattern["metadata"]>;
  repository: string;
  revision: string;
  sourceFormats?: Record<string, CatalogPattern["sourceFormats"]>;
  validators?: string[];
}

export interface CoveringExclusion {
  glob: string;
  reason: string;
  schemaIds: string[];
}

interface ManagedApp {
  args: string[];
  command: string;
  env: NodeJS.ProcessEnv;
}

interface PullerOptions {
  configPath?: string;
  refreshDiscovery: boolean;
  registryPath?: string;
  update: boolean;
}

interface RunResult {
  code: null | number;
  stderr: string;
  stdout: string;
}

const CATALOG_TAG = /^catalog-(\d{4})(\d{2})(\d{2})\.(\d{2})(\d{2})$/;

export function parsePullerArgs(args: readonly string[]): PullerOptions {
  let configPath: string | undefined;
  let refreshDiscovery = false;
  let registryPath: string | undefined;
  let update = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    switch (arg) {
      case "--config": {
        const value = args[index + 1];
        if (!value || value.startsWith("--")) {
          throw new Error("--config requires a path");
        }
        configPath = value;
        index += 1;

        break;
      }
      case "--refresh-discovery": {
        refreshDiscovery = true;

        break;
      }
      case "--update": {
        update = true;

        break;
      }
      default: {
        if (arg.startsWith("--config=")) {
          configPath = arg.slice("--config=".length);
          if (!configPath) throw new Error("--config requires a path");
        } else if (!arg.startsWith("--") && registryPath === undefined) {
          registryPath = arg;
        }
      }
    }
  }

  if (update && refreshDiscovery) {
    throw new Error("--update and --refresh-discovery are mutually exclusive");
  }
  return { configPath, refreshDiscovery, registryPath, update };
}

const root = resolve(import.meta.dirname, "..");
const DEFAULT_VALIDATORS = ["sourcemeta", "check-jsonschema", "ajv"] as const;

export function buildCoveringData(
  patterns: CatalogPattern[],
  validators: string[],
): { covering: NonNullable<CatalogPin["covering"]>; globs: string[] } {
  const requested = new Set(validators);
  const owners = new Map<string, Set<string>>();
  for (const { covering, id } of patterns) {
    if (!covering) {
      throw new Error("Schepherd returned catalog patterns without covering metadata");
    }
    if (
      covering.validators.length !== requested.size ||
      covering.validators.some((id) => !requested.has(id))
    ) {
      throw new Error("Schepherd covering metadata does not match the requested validators");
    }
    for (const glob of covering.globs) {
      const ids = owners.get(glob) ?? new Set<string>();
      ids.add(id);
      owners.set(glob, ids);
    }
  }

  const collisions = [...owners]
    .filter(([, ids]) => ids.size > 1)
    .map(([glob, ids]) => ({
      glob,
      reason: "multiple catalog schemas share this fileMatch glob; add an explicit mapping",
      schemaIds: [...ids].toSorted(),
    }))
    .toSorted((left, right) => left.glob.localeCompare(right.glob));
  const collisionGlobs = new Set(collisions.map(({ glob }) => glob));
  const covering = Object.fromEntries(
    patterns.map(({ covering, id }) => {
      const exclusions = new Map<string, CoveringExclusion>();
      for (const exclusion of covering!.excluded ?? []) {
        exclusions.set(exclusion.glob, exclusion);
      }
      for (const collision of collisions.filter(({ schemaIds }) => schemaIds.includes(id))) {
        const schemaIds = new Set([
          ...(exclusions.get(collision.glob)?.schemaIds ?? []),
          ...collision.schemaIds,
        ]);
        exclusions.set(collision.glob, {
          glob: collision.glob,
          reason: collision.reason,
          schemaIds: [...schemaIds].toSorted(),
        });
      }
      const excluded = [...exclusions.values()].toSorted((left, right) =>
        left.glob.localeCompare(right.glob),
      );
      return [id, { ...covering!, ...(excluded.length > 0 ? { excluded } : {}) }];
    }),
  );
  const globs = [...owners.keys()].filter((glob) => !collisionGlobs.has(glob)).toSorted();
  return { covering, globs };
}

export function buildCoveringGlobs(patterns: CatalogPattern[], validators: string[]): string[] {
  return buildCoveringData(patterns, validators).globs;
}

export function buildValidatorMetadata(
  patterns: CatalogPattern[],
  validators: readonly string[] = DEFAULT_VALIDATORS,
): {
  metadata: NonNullable<CatalogPin["metadata"]>;
  sourceFormats: NonNullable<CatalogPin["sourceFormats"]>;
} {
  const metadata: NonNullable<CatalogPin["metadata"]> = {};
  const sourceFormats: NonNullable<CatalogPin["sourceFormats"]> = {};
  for (const pattern of patterns) {
    if (!pattern.metadata || !pattern.sourceFormats) {
      throw new Error(`Schepherd returned incomplete catalog metadata for ${pattern.id}`);
    }
    if (!/^sha256:[a-f0-9]{64}$/.test(pattern.metadata.schemaDigest)) {
      throw new Error(`Schepherd returned an invalid schema digest for ${pattern.id}`);
    }
    const profileIds = new Set(pattern.metadata.profiles.map(({ processor }) => processor));
    if (profileIds.size !== pattern.metadata.profiles.length) {
      throw new Error(`Schepherd returned duplicate processor profiles for ${pattern.id}`);
    }
    for (const validator of validators) {
      if (!profileIds.has(validator)) {
        throw new Error(`Schepherd omitted the ${validator} profile for ${pattern.id}`);
      }
    }
    for (const profile of pattern.metadata.profiles) {
      if (!/^sha256:[a-f0-9]{64}$/.test(profile.settingsDigest)) {
        throw new Error(
          `Schepherd returned an invalid settings digest for ${pattern.id}/${profile.processor}`,
        );
      }
      const toolDigestPattern =
        profile.processor === "sourcemeta"
          ? /^sha256:[a-f0-9]{64}$/
          : /^sha256:[a-f0-9]{64}:sha256:[a-f0-9]{64}$/;
      if (!toolDigestPattern.test(profile.tool)) {
        throw new Error(
          `Schepherd returned an invalid tool identity for ${pattern.id}/${profile.processor}`,
        );
      }
      if (profile.result !== "supported" && profile.result !== "unsupported") {
        throw new Error(
          `Schepherd returned an invalid profile result for ${pattern.id}/${profile.processor}`,
        );
      }
      if (profile.result === "unsupported" && !profile.reason) {
        throw new Error(
          `Schepherd omitted the unsupported reason for ${pattern.id}/${profile.processor}`,
        );
      }
    }
    metadata[pattern.id] = pattern.metadata;
    sourceFormats[pattern.id] = pattern.sourceFormats;
  }
  return { metadata, sourceFormats };
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

function describeDrift(recorded: Partial<CatalogPin>, next: CatalogPin): string[] {
  const lines: string[] = [];
  for (const key of ["repository", "revision", "digest"] as const) {
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
  for (const key of ["validators", "metadata", "sourceFormats", "covering"] as const) {
    if (JSON.stringify(recorded[key] ?? null) !== JSON.stringify(next[key] ?? null)) {
      lines.push(`${key}: changed`);
    }
  }
  return lines;
}

function dmExec(app: string, args: string[], configPath?: string): string {
  const configArgs = configPath ? ["--config", configPath] : [];
  const result = spawnSync(
    process.execPath,
    [resolve(root, "bin/datamitsu.js"), ...configArgs, "exec", app, "--", ...args],
    { cwd: root, encoding: "utf8", maxBuffer: 64 << 20 },
  );
  if (result.status !== 0) {
    throw new Error(`${app} ${args.join(" ")} exited with ${result.status}:\n${result.stderr}`);
  }
  return result.stdout;
}

async function main(): Promise<void> {
  const options = parsePullerArgs(process.argv.slice(2));
  const update = options.update;
  const refreshDiscovery = options.refreshDiscovery;
  const registryPath = options.registryPath ? resolve(root, options.registryPath) : undefined;
  const configPath = options.configPath ? resolve(root, options.configPath) : undefined;

  if (!registryPath) {
    console.error(
      "Usage: pull-schepherd-catalog.ts [--update | --refresh-discovery] [--config <datamitsu-layer>] <path-to-schepherdCatalog.json>",
    );
    process.exit(1);
  }

  if (refreshDiscovery) {
    console.log(
      "Refreshing catalog discovery for the recorded digest without selecting a new revision",
    );
  }

  const recorded = JSON.parse(
    await fsPromise.readFile(registryPath, "utf8"),
  ) as Partial<CatalogPin> & Pick<CatalogPin, "repository">;

  let reference = `${recorded.repository}@${recorded.digest}`;
  if (update) {
    const cutoff = minReleaseAgeCutoffFromEnvironment(new Date());
    console.log(
      cutoff
        ? `Minimum release age: catalogs published before ${cutoff.toISOString()}`
        : "Minimum release age: disabled",
    );
    const tags = dmExec("crane", ["ls", recorded.repository], configPath).split("\n");
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

  const pin = JSON.parse(
    dmExec("schepherd", ["--quiet", "pin", reference, "--json"], configPath),
  ) as {
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

  const validatorIds = [...DEFAULT_VALIDATORS];
  const schepherd = managedApp("schepherd", configPath);
  const catalogArgs = ["--quiet", "--repository", pin.repository, "--catalog", pin.digest];
  const selected = await run(
    schepherd.command,
    [
      ...schepherd.args,
      ...catalogArgs,
      "patterns",
      "--validators",
      validatorIds.join(","),
      "--covering",
      "--json",
    ],
    schepherd.env,
  );

  if (selected.code !== 0) {
    throw new Error(
      `schepherd patterns --validators failed with ${selected.code}:\n${selected.stderr}\n` +
        "Use a Schepherd client that supports covering pattern discovery and v2 runtime probes.",
    );
  }
  const patterns = JSON.parse(selected.stdout) as CatalogPattern[];
  const ids = new Set(patterns.map(({ id }) => id));
  if (ids.size !== patterns.length)
    throw new Error("Schepherd returned duplicate catalog schema IDs");
  const { covering, globs } = buildCoveringData(patterns, validatorIds);
  const hasMetadata = patterns.every(({ metadata, sourceFormats }) => metadata && sourceFormats);
  const lacksMetadata = patterns.every(
    ({ metadata, sourceFormats }) => !metadata && !sourceFormats,
  );
  if (!hasMetadata && !lacksMetadata)
    throw new Error("Schepherd returned partial catalog metadata");
  const normalized = hasMetadata ? buildValidatorMetadata(patterns, validatorIds) : undefined;
  const metadata = normalized?.metadata;
  const sourceFormats = normalized?.sourceFormats;

  const excludedGlobs = new Set(
    Object.values(covering).flatMap(({ excluded }) => excluded?.map(({ glob }) => glob) ?? []),
  );
  if (excludedGlobs.size > 0) {
    console.log(
      `Excluded ${excludedGlobs.size} colliding catalog globs; add explicit mappings to validate them: ${[...excludedGlobs].toSorted().join(", ")}`,
    );
  }
  console.log(
    hasMetadata
      ? `Using catalog compatibility metadata for ${patterns.length} schemas and ${validatorIds.join(", ")}`
      : `Using runtime validator probes for ${patterns.length} schemas from the v2 catalog`,
  );

  const next: CatalogPin = {
    covering,
    digest: pin.digest,
    globs,
    ...(metadata ? { metadata } : {}),
    repository: pin.repository,
    revision: pin.revision,
    ...(sourceFormats ? { sourceFormats } : {}),
    validators: validatorIds,
  };
  console.log(`${next.globs.length} covering globs from ${patterns.length} schemas`);

  const drift = describeDrift(recorded, next);
  if (drift.length === 0) {
    console.log("The recorded catalog pin is current; nothing to write.");
    return;
  }
  for (const line of drift) {
    console.log(`  ${line}`);
  }
  if (!update && !refreshDiscovery) {
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
function managedApp(name: string, configPath?: string): ManagedApp {
  const configArgs = configPath ? ["--config", configPath] : [];
  const result = spawnSync(
    process.execPath,
    [resolve(root, "bin/datamitsu.js"), ...configArgs, "source", "status", "--json"],
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

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<RunResult> {
  const { promise, reject, resolve: resolveResult } = Promise.withResolvers<RunResult>();
  const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
  child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
  child.on("error", reject);
  child.on("close", (code) => resolveResult({ code, stderr, stdout }));
  return promise;
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
