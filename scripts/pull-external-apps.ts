import { createHash } from "node:crypto";
import fsPromise from "node:fs/promises";

interface BinaryEntry {
  binaryPath?: string;
  contentType: string;
  hash: string;
  url: string;
}

interface ExternalAppMeta {
  binaryPathTemplate?: string;
  contentType: string;
  contentTypeMap?: Record<string, string>;
  description: string;
  extMap?: Record<string, string>;
  latestVersionType?: "github-release" | "text";
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
  extMap?: Record<string, string>,
): string {
  const ext = extMap
    ? (extMap[replacements.os] ?? extMap["default"] ?? "")
    : replacements.os === "windows"
      ? ".exe"
      : "";
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

async function fetchLatestVersion(
  url: string,
  type: "github-release" | "text" = "text",
): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  }
  if (type === "github-release") {
    const json = await resp.json();
    return (json as { tag_name: string }).tag_name;
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
      const latestVersion = await fetchLatestVersion(
        appMeta.latestVersionUrl,
        appMeta.latestVersionType,
      );
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
        const url = buildUrl(appMeta.urlTemplate, { arch, os, version }, appMeta.extMap);
        const contentType = appMeta.contentTypeMap?.[os] ?? appMeta.contentType;
        console.log(`  ${appName} ${os}/${arch}: downloading ${url}`);
        const hash = await computeSha256(url);
        const entry: BinaryEntry = { contentType, hash, url };
        if (appMeta.binaryPathTemplate) {
          const binExt = os === "windows" ? ".exe" : "";
          entry.binaryPath = appMeta.binaryPathTemplate
            .replaceAll("{os}", os)
            .replaceAll("{arch}", arch)
            .replaceAll("{binExt}", binExt);
        }
        binariesMap[os][arch] = { [libc]: entry };
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
