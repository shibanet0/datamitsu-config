import { createHash } from "node:crypto";
import fsPromise from "node:fs/promises";

interface BinaryEntry {
  contentType: string;
  hash: string;
  url: string;
}

interface ExternalAppMeta {
  contentType: string;
  description: string;
  latestVersionUrl: string;
  platforms: Record<string, Record<string, string>>;
  source: string;
  urlTemplate: string;
  version: string;
  versionCheck?: { args: string[] };
}

interface ExternalRegistry {
  apps: Record<string, ExternalAppMeta>;
  binaries: Record<
    string,
    {
      binaries: Record<string, Record<string, Record<string, BinaryEntry>>>;
      description: string;
    }
  >;
}

function buildUrl(
  template: string,
  replacements: { arch: string; os: string; version: string },
): string {
  const ext = replacements.os === "windows" ? ".exe" : "";
  return template
    .replaceAll("{version}", replacements.version)
    .replaceAll("{os}", replacements.os)
    .replaceAll("{arch}", replacements.arch)
    .replaceAll("{ext}", ext);
}

async function computeSha256(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download ${url}: ${resp.status}`);
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  return createHash("sha256").update(buffer).digest("hex");
}

async function fetchLatestVersion(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  }
  const text = await resp.text();
  return text.trim();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const update = args.includes("--update");
  const registryPath = args.find((a) => !a.startsWith("--"));

  if (!registryPath) {
    console.error("Usage: pull-external-apps.ts [--update] <path-to-externalApps.json>");
    process.exit(1);
  }

  const registry: ExternalRegistry = JSON.parse(await fsPromise.readFile(registryPath, "utf8"));

  for (const [appName, appMeta] of Object.entries(registry.apps)) {
    let { version } = appMeta;

    if (update) {
      const latestVersion = await fetchLatestVersion(appMeta.latestVersionUrl);
      if (latestVersion === version) {
        console.log(`${appName}: already at latest ${version}`);
      } else {
        console.log(`${appName}: ${version} -> ${latestVersion}`);
        version = latestVersion;
        appMeta.version = latestVersion;
      }
    }

    const binariesMap: Record<string, Record<string, Record<string, BinaryEntry>>> = {};

    for (const [os, arches] of Object.entries(appMeta.platforms)) {
      binariesMap[os] = {};
      for (const [arch, libc] of Object.entries(arches)) {
        const url = buildUrl(appMeta.urlTemplate, { arch, os, version });
        console.log(`  ${appName} ${os}/${arch}: downloading ${url}`);
        const hash = await computeSha256(url);
        binariesMap[os][arch] = {
          [libc]: {
            contentType: appMeta.contentType,
            hash,
            url,
          },
        };
      }
    }

    registry.binaries[appName] = {
      binaries: binariesMap,
      description: appMeta.description,
    };
  }

  await fsPromise.writeFile(registryPath, JSON.stringify(registry, null, 2) + "\n", "utf8");
  console.log("Done.");
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/pull-external-apps.ts");

if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}
