import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

interface Manifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface Workspace {
  catalog?: Record<string, unknown>;
}

export function resolvePublishCatalog(manifest: Manifest, workspace: Workspace): Manifest {
  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = manifest[field];
    if (!dependencies) continue;

    for (const [name, specifier] of Object.entries(dependencies)) {
      if (specifier !== "catalog:" && specifier !== "catalog:default") continue;

      const version = workspace.catalog?.[name];
      if (typeof version !== "string" || version.length === 0) {
        throw new Error(`Could not resolve ${name}@${specifier} from the default pnpm catalog`);
      }
      dependencies[name] = version;
    }
  }

  return manifest;
}

async function main(rootDir: string): Promise<void> {
  const manifestPath = path.join(rootDir, "package.json");
  const workspacePath = path.join(rootDir, "pnpm-workspace.yaml");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const workspace = parse(await readFile(workspacePath, "utf8")) as Workspace;

  resolvePublishCatalog(manifest, workspace);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/resolve-publish-catalog.ts");

if (isDirectRun) {
  await main(path.join(import.meta.dirname, ".."));
}
