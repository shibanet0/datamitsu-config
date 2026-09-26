import { createHash } from "node:crypto";
import fsPromise from "node:fs/promises";

export interface Release {
  draft: boolean;
  prerelease: boolean;
  publishedAt: string;
  tag: string;
}

interface BinaryEntry {
  binaryPath?: string;
  contentType: string;
  hash: string;
  url: string;
}

interface ExternalAppMeta {
  binaryPathTemplate?: string;
  /**
   * Where upstream publishes each asset's sha256; `{url}` is the asset URL.
   */
  checksumUrlTemplate?: string;
  contentType: string;
  contentTypeMap?: Record<string, string>;
  description: string;
  extMap?: Record<string, string>;
  /**
   * `owner/repo` whose GitHub releases date each version for the minimum release age.
   */
  githubRepo: string;
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

/**
 * The same default datamitsu applies to its own `pull-*` commands.
 */
const DEFAULT_MIN_RELEASE_AGE_MINUTES = 10_080;

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) {
    throw new Error(`cannot compare versions ${a} and ${b}`);
  }
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) {
      return left[index]! - right[index]!;
    }
  }
  return 0;
}

/**
 * `undefined` disables the age filter, as `0` does for datamitsu's own pulls.
 */
export function minReleaseAgeCutoff(minutes: string | undefined, now: Date): Date | undefined {
  const value =
    minutes === undefined || minutes === "" ? DEFAULT_MIN_RELEASE_AGE_MINUTES : Number(minutes);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`DATAMITSU_MIN_RELEASE_AGE must be a non-negative integer, got ${minutes}`);
  }
  return value === 0 ? undefined : new Date(now.getTime() - value * 60_000);
}

/**
 * The first sha256 in a checksum file: either a bare hash or `<hash> <file name>`.
 */
export function parseChecksumFile(text: string): string | undefined {
  return /\b[0-9a-f]{64}\b/i.exec(text)?.[0].toLowerCase();
}

export function parseVersion(tag: string): [number, number, number] | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
}

/**
 * The newest stable release that upstream's own "latest" does not exceed and that is older than the
 * cutoff. The ceiling keeps "latest" meaning what the upstream says it means — a patch for an older
 * line published after the current one never wins — and the cutoff applies the minimum release age.
 * `undefined` when nothing qualifies.
 */
export function selectRelease(
  releases: Release[],
  ceiling: string,
  cutoff: Date | undefined,
): string | undefined {
  const eligible = releases.filter(
    (release) =>
      !release.draft &&
      !release.prerelease &&
      parseVersion(release.tag) !== undefined &&
      compareVersions(release.tag, ceiling) <= 0 &&
      (cutoff === undefined || new Date(release.publishedAt) <= cutoff),
  );
  return eligible
    .map((release) => release.tag)
    .toSorted(compareVersions)
    .at(-1);
}

function buildUrl(
  template: string,
  replacements: { arch: string; os: string; version: string },
  extensionMap?: Record<string, string>,
): string {
  const extension = extensionMap
    ? (extensionMap[replacements.os] ?? extensionMap["default"] ?? "")
    : replacements.os === "windows"
      ? ".exe"
      : "";
  return template
    .replaceAll("{version}", replacements.version)
    .replaceAll("{os}", replacements.os)
    .replaceAll("{arch}", replacements.arch)
    .replaceAll("{ext}", extension);
}

async function computeSha256(url: string): Promise<string> {
  const resp = await fetchOk(url, undefined);
  const buffer = Buffer.from(await resp.arrayBuffer());
  return createHash("sha256").update(buffer).digest("hex");
}

async function fetchLatestVersion(
  url: string,
  type: "github-release" | "text" = "text",
  githubToken: string | undefined,
): Promise<string> {
  const resp = await fetchOk(url, githubToken);
  if (type === "github-release") {
    const json = await resp.json();
    return (json as { tag_name: string }).tag_name;
  }
  const text = await resp.text();
  return text.trim();
}

async function fetchOk(url: string, githubToken: string | undefined): Promise<Response> {
  const headers: Record<string, string> = {};
  if (githubToken && new URL(url).hostname === "api.github.com") {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }
  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  }
  return resp;
}

/**
 * The latest 100 releases, newest first — enough to reach past a week of patch releases.
 */
async function fetchReleases(repo: string, githubToken: string | undefined): Promise<Release[]> {
  const resp = await fetchOk(
    `https://api.github.com/repos/${repo}/releases?per_page=100`,
    githubToken,
  );
  const json = (await resp.json()) as {
    draft: boolean;
    prerelease: boolean;
    published_at: string;
    tag_name: string;
  }[];
  return json.map((release) => ({
    draft: release.draft,
    prerelease: release.prerelease,
    publishedAt: release.published_at,
    tag: release.tag_name,
  }));
}

async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  const update = arguments_.includes("--update");
  const registryPath = arguments_.find((a) => !a.startsWith("--"));

  if (!registryPath) {
    console.error("Usage: pull-external-apps.ts [--update] <path-to-externalApps.json>");
    process.exit(1);
  }

  const cutoff = minReleaseAgeCutoff(process.env.DATAMITSU_MIN_RELEASE_AGE, new Date());
  const githubToken = process.env.GITHUB_TOKEN;
  const registry: ExternalRegistry = JSON.parse(await fsPromise.readFile(registryPath, "utf8"));
  const errors: string[] = [];
  let changed = false;

  console.log(
    cutoff
      ? `Minimum release age: releases published before ${cutoff.toISOString()}`
      : "Minimum release age: disabled",
  );

  for (const [appName, appMeta] of Object.entries(registry.apps)) {
    let { version } = appMeta;

    if (update) {
      const ceiling = await fetchLatestVersion(
        appMeta.latestVersionUrl,
        appMeta.latestVersionType,
        githubToken,
      );
      const releases = await fetchReleases(appMeta.githubRepo, githubToken);
      const selected = selectRelease(releases, ceiling, cutoff);
      if (selected === undefined) {
        console.warn(`${appName}: no release up to ${ceiling} is old enough; keeping ${version}`);
      } else if (compareVersions(selected, version) > 0) {
        console.log(`${appName}: ${version} -> ${selected} (upstream latest: ${ceiling})`);
        version = selected;
      } else {
        console.log(`${appName}: ${version} is current (upstream latest: ${ceiling})`);
      }
    }

    const bumped = version !== appMeta.version;
    const binariesMap: Record<string, Record<string, Record<string, BinaryEntry>>> = {};

    for (const [os, arches] of Object.entries(appMeta.platforms)) {
      binariesMap[os] = {};
      for (const [arch, libc] of Object.entries(arches)) {
        const url = buildUrl(appMeta.urlTemplate, { arch, os, version }, appMeta.extMap);
        const contentType = appMeta.contentTypeMap?.[os] ?? appMeta.contentType;
        console.log(`  ${appName} ${os}/${arch}: downloading ${url}`);
        const sha256 = await computeSha256(url);

        if (appMeta.checksumUrlTemplate) {
          const checksumUrl = appMeta.checksumUrlTemplate.replaceAll("{url}", url);
          const published = parseChecksumFile(await (await fetchOk(checksumUrl, undefined)).text());
          if (published !== sha256) {
            errors.push(
              `${appName} ${os}/${arch}: ${url} hashes to ${sha256}, ${checksumUrl} says ${published}`,
            );
          }
        }

        const recorded = registry.binaries[appName]?.binaries[os]?.[arch]?.[libc]?.hash;
        if (!bumped && recorded !== sha256) {
          errors.push(
            `${appName} ${os}/${arch}: ${url} hashes to ${sha256}, the registry records ${recorded}`,
          );
        }

        const entry: BinaryEntry = { contentType, hash: sha256, url };
        if (appMeta.binaryPathTemplate) {
          const binExtension = os === "windows" ? ".exe" : "";
          entry.binaryPath = appMeta.binaryPathTemplate
            .replaceAll("{os}", os)
            .replaceAll("{arch}", arch)
            .replaceAll("{binExt}", binExtension);
        }
        binariesMap[os][arch] = { [libc]: entry };
      }
    }

    if (bumped) {
      appMeta.version = version;
      registry.binaries[appName] = {
        binaries: binariesMap,
        description: appMeta.description,
      };
      changed = true;
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} hash mismatch(es); the registry was not written:`);
    for (const error of errors) {
      console.error(`  ${error}`);
    }
    process.exit(1);
  }

  if (changed) {
    await fsPromise.writeFile(registryPath, JSON.stringify(registry, null, 2) + "\n", "utf8");
    console.log("Registry updated.");
  } else {
    console.log("Every recorded hash matches; nothing to write.");
  }
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
