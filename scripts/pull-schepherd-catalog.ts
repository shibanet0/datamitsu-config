import { spawnSync } from "node:child_process";
import fsPromise from "node:fs/promises";
import { resolve } from "node:path";

import { minReleaseAgeCutoffFromEnvironment } from "./pull-external-apps.ts";

export interface CatalogPin {
  digest: string;
  repository: string;
  revision: string;
}

interface PullerOptions {
  configPath?: string;
  registryPath?: string;
  update: boolean;
  write: boolean;
}

const CATALOG_TAG = /^catalog-(\d{4})(\d{2})(\d{2})\.(\d{2})(\d{2})$/;
const root = resolve(import.meta.dirname, "..");

export function parseCatalogTag(tag: string): Date | undefined {
  const match = CATALOG_TAG.exec(tag);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match.map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!));
}

export function parsePullerArgs(args: readonly string[]): PullerOptions {
  let configPath: string | undefined;
  let registryPath: string | undefined;
  let update = false;
  let write = false;

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
      case "--update": {
        update = true;
        break;
      }
      case "--write": {
        write = true;
        break;
      }
      default: {
        if (arg.startsWith("--config=")) {
          configPath = arg.slice("--config=".length);
          if (!configPath) throw new Error("--config requires a path");
        } else if (arg.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`);
        } else if (registryPath === undefined) {
          registryPath = arg;
        }
      }
    }
  }
  return { configPath, registryPath, update, write };
}

// Mutable tags cannot establish the publication age of a reproducible pin.
export function selectCatalogTag(tags: string[], cutoff: Date | undefined): string | undefined {
  return tags
    .filter((tag) => {
      const published = parseCatalogTag(tag);
      return published !== undefined && (cutoff === undefined || published <= cutoff);
    })
    .toSorted()
    .at(-1);
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
  if (!options.registryPath) {
    throw new Error(
      "Usage: pull-schepherd-catalog.ts [--update | --write] [--config <datamitsu-layer>] <path-to-schepherdCatalog.json>",
    );
  }
  const registryPath = resolve(root, options.registryPath);
  const recorded = JSON.parse(await fsPromise.readFile(registryPath, "utf8")) as CatalogPin;
  let reference = `${recorded.repository}@${recorded.digest}`;
  if (options.update) {
    const cutoff = minReleaseAgeCutoffFromEnvironment(new Date());
    console.log(
      cutoff
        ? `Minimum release age: catalogs published before ${cutoff.toISOString()}`
        : "Minimum release age: disabled",
    );
    const tags = dmExec("crane", ["ls", recorded.repository], options.configPath).split("\n");
    const tag = selectCatalogTag(tags, cutoff);
    if (tag === undefined) {
      if (!recorded.digest)
        throw new Error(`${recorded.repository}: no catalog is old enough to pin`);
      console.warn(
        `${recorded.repository}: no newer catalog is old enough; keeping ${recorded.revision}`,
      );
    } else {
      reference = `${recorded.repository}:${tag}`;
    }
  }

  const pin = JSON.parse(
    dmExec("schepherd", ["--quiet", "pin", reference, "--json"], options.configPath),
  ) as CatalogPin & { schemas: number };
  if (!options.update && pin.revision !== recorded.revision) {
    throw new Error(
      `${reference} is revision ${pin.revision}, the registry records ${recorded.revision}`,
    );
  }
  const next: CatalogPin = {
    digest: pin.digest,
    repository: pin.repository,
    revision: pin.revision,
  };
  console.log(`${pin.repository}: revision ${pin.revision}, ${pin.schemas} schemas, ${pin.digest}`);
  const nextContent = JSON.stringify(next, null, 2) + "\n";
  if (JSON.stringify(recorded) === JSON.stringify(next)) {
    console.log("The recorded catalog pin is current; nothing to write.");
    return;
  }
  if (!options.update && !options.write) {
    throw new Error("The recorded catalog pin has drifted; run `task pull:external:update`.");
  }
  await fsPromise.writeFile(registryPath, nextContent, "utf8");
  console.log("Catalog pin updated.");
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
