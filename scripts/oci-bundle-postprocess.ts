/**
 * OCI bundle post-process (datamitsu plan §7, phase 3).
 *
 * The buildx-pushed images already carry one layer per store subtree (the final stage's `COPY
 * --link` instructions). This script makes those images consumable by `datamitsu store seed`
 * without docker:
 *
 * 1. For every platform manifest of every variant (debian=glibc, alpine=musl) it writes the
 *    `com.datamitsu.subtree` layer annotations from the generator's docker/oci-map*.json — deriving
 *    the content-hash path segment from the layer's own tar listing — plus the
 *    `com.datamitsu.store-root` / `com.datamitsu.libc` manifest annotations;
 * 2. Pushes each annotated manifest (untagged — blobs are shared, the overhead is kilobytes of JSON;
 *    the runnable tags are never touched);
 * 3. Assembles the bundle index (platform + `com.datamitsu.libc` descriptor annotations, buildx
 *    attestation manifests filtered out) and pushes it under a TAG (untagged indexes are prey to
 *    registry cleanup actions).
 *
 * A wrong layer↔subtree mapping is not a security hole: the consumer's per-subtree write-allowlist
 * validates layer content against the declared subtree at pull time and fails loudly. The digest
 * printed at the end is what gets pinned into the config's `oci` declaration.
 *
 * Usage:
 * node scripts/oci-bundle-postprocess.ts\
 * --image ghcr.io/shibanet0/datamitsu-config-unstable\
 * --tag unstable-20260610-abc1234\
 * --bundle-tag bundle-unstable-20260610-abc1234\
 * [--variants debian,alpine] [--plain-http] [--config datamitsu.config.js]
 */

import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { createGunzip, createZstdDecompress } from "node:zlib";

import { TarNameParser } from "./lib/tar-name-parser.ts";

interface Descriptor {
  annotations?: Record<string, string>;
  digest: string;
  mediaType: string;
  platform?: { architecture: string; os: string; variant?: string };
  size: number;
}

interface Manifest {
  annotations?: Record<string, string>;
  config: Descriptor;
  layers: Descriptor[];
  mediaType: string;
  schemaVersion: number;
}

interface OciMap {
  layers: OciMapEntry[];
  storeRoot: string;
  version: number;
}

interface OciMapEntry {
  app?: string;
  kind: "app" | "binary" | "runtime" | "uv-python";
  subtree: string;
}

const INDEX_TYPES = new Set([
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.oci.image.index.v1+json",
]);

const ANNOTATION_SUBTREE = "com.datamitsu.subtree";
const ANNOTATION_KIND = "com.datamitsu.kind";
const ANNOTATION_APP = "com.datamitsu.app";
const ANNOTATION_LIBC = "com.datamitsu.libc";
const ANNOTATION_STORE_ROOT = "com.datamitsu.store-root";
const ANNOTATION_CONFIG_HASH = "com.datamitsu.from-config-hash";
const ANNOTATION_VERSION = "com.datamitsu.datamitsu-version";

/**
 * Minimal OCI registry v2 client over fetch with bearer-token auth.
 */
class Registry {
  readonly repo: string;
  private readonly base: string;
  private readonly host: string;
  private token: string | undefined;

  constructor(image: string, plainHttp: boolean) {
    const slash = image.indexOf("/");
    if (slash === -1) {
      throw new Error(`image ${image} has no repository path`);
    }
    this.host = image.slice(0, slash);
    this.repo = image.slice(slash + 1);
    this.base = `${plainHttp ? "http" : "https"}://${this.host}/v2/${this.repo}`;
  }

  /**
   * Streams a blob; the caller may destroy the stream early to stop the download.
   */
  async blobStream(digest: string): Promise<{ abort: () => void; stream: Readable }> {
    const controller = new AbortController();
    const response = await this.request(`/blobs/${digest}`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`GET blob ${digest}: ${response.status}`);
    }
    return {
      abort: () => controller.abort(),
      stream: Readable.fromWeb(response.body as import("node:stream/web").ReadableStream),
    };
  }

  async getManifest(reference: string): Promise<{ bytes: Buffer; contentType: string }> {
    const accept = [
      "application/vnd.oci.image.index.v1+json",
      "application/vnd.docker.distribution.manifest.list.v2+json",
      "application/vnd.oci.image.manifest.v1+json",
      "application/vnd.docker.distribution.manifest.v2+json",
    ].join(", ");
    const response = await this.request(`/manifests/${reference}`, { method: "GET" }, accept);
    if (!response.ok) {
      throw new Error(`GET manifest ${reference}: ${response.status} ${await response.text()}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (reference.startsWith("sha256:") && `sha256:${sha256Hex(bytes)}` !== reference) {
      throw new Error(`manifest body does not match requested digest ${reference}`);
    }
    return {
      bytes,
      contentType:
        response.headers.get("content-type") ?? "application/vnd.oci.image.manifest.v1+json",
    };
  }

  async putManifest(reference: string, bytes: Uint8Array, contentType: string): Promise<string> {
    const response = await this.request(`/manifests/${reference}`, {
      body: bytes,
      headers: { "Content-Type": contentType },
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`PUT manifest ${reference}: ${response.status} ${await response.text()}`);
    }
    return `sha256:${sha256Hex(bytes)}`;
  }

  private async authenticate(challenge: string): Promise<void> {
    const params = new Map<string, string>();
    for (const part of challenge.replace(/^Bearer\s+/i, "").split(",")) {
      const [key, value] = part.split("=");
      if (key && value) {
        params.set(key.trim(), value.trim().replaceAll('"', ""));
      }
    }
    const realm = params.get("realm");
    if (!realm) {
      throw new Error(`unsupported auth challenge: ${challenge}`);
    }
    const url = new URL(realm);
    const service = params.get("service");
    if (service) {
      url.searchParams.set("service", service);
    }
    // Request push too: the same token is reused for manifest PUTs.
    url.searchParams.set("scope", `repository:${this.repo}:pull,push`);

    const headers: Record<string, string> = {};
    const password = process.env.GITHUB_TOKEN ?? process.env.GHCR_TOKEN;
    if (password) {
      headers.Authorization = `Basic ${Buffer.from(`x-access-token:${password}`).toString("base64")}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`token endpoint returned ${response.status}`);
    }
    const payload = (await response.json()) as { access_token?: string; token?: string };
    this.token = payload.token ?? payload.access_token;
    if (!this.token) {
      throw new Error("token endpoint returned no token");
    }
  }

  private async request(path: string, init: RequestInit, accept?: string): Promise<Response> {
    const headers = new Headers(init.headers);
    if (accept) {
      headers.set("Accept", accept);
    }
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }
    let response = await fetch(this.base + path, { ...init, headers });
    if (response.status === 401) {
      const challenge = response.headers.get("www-authenticate");
      if (!challenge) {
        throw new Error("registry returned 401 without a challenge");
      }
      await this.authenticate(challenge);
      headers.set("Authorization", `Bearer ${this.token}`);
      response = await fetch(this.base + path, { ...init, headers });
    }
    return response;
  }
}

async function annotateVariantManifest(
  registry: Registry,
  manifestBytes: Buffer,
  map: OciMap,
  libc: string | undefined,
  meta: { configHash: string; version: string },
): Promise<{ digest: string; mediaType: string; size: number }> {
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as Manifest;
  const mapLayers = map.layers;
  if (manifest.layers.length < mapLayers.length) {
    throw new Error(
      `manifest has ${manifest.layers.length} layers but the oci map declares ${mapLayers.length} — map drifted from the built image (§12.13)`,
    );
  }

  // The per-subtree COPYs form one CONSECUTIVE block of layers in Dockerfile
  // order, but it is neither at the very start (base image + config layers
  // precede it) nor at the very end (a later WORKDIR adds a trailing layer).
  // Locate the block by probing layers for the first map entry's COPY root,
  // then validate every following layer against its own map entry.
  const storeRootRelative = map.storeRoot.replace(/^\//, "");
  const lastStart = manifest.layers.length - mapLayers.length;
  let start = -1;
  for (let candidate = 0; candidate <= lastStart; candidate += 1) {
    if (
      await resolveSubtree(registry, manifest.layers[candidate], mapLayers[0], storeRootRelative)
    ) {
      start = candidate;
      break;
    }
  }
  if (start < 0) {
    throw new Error(
      `no layer contains ${mapLayers[0].subtree} — oci map drifted from the built image (§12.13)`,
    );
  }

  for (const [index, entry] of mapLayers.entries()) {
    const layer = manifest.layers[start + index];
    const subtree = await resolveSubtree(registry, layer, entry, storeRootRelative);
    if (!subtree) {
      throw new Error(
        `layer ${start + index} (${layer.digest}) contains no entry under ${entry.subtree} — oci map drifted from the built image (§12.13)`,
      );
    }
    layer.annotations = {
      ...layer.annotations,
      [ANNOTATION_APP]: entry.app ?? "",
      [ANNOTATION_KIND]: entry.kind,
      [ANNOTATION_SUBTREE]: subtree,
    };
    if (!entry.app) {
      delete layer.annotations[ANNOTATION_APP];
    }
  }

  manifest.annotations = {
    ...manifest.annotations,
    [ANNOTATION_CONFIG_HASH]: meta.configHash,
    [ANNOTATION_STORE_ROOT]: map.storeRoot,
    [ANNOTATION_VERSION]: meta.version,
    ...(libc ? { [ANNOTATION_LIBC]: libc } : {}),
  };

  const bytes = Buffer.from(JSON.stringify(manifest, undefined, 2));
  const digest = `sha256:${sha256Hex(bytes)}`;
  await registry.putManifest(digest, bytes, manifest.mediaType);
  console.log(`  annotated manifest pushed: ${digest}`);
  return { digest, mediaType: manifest.mediaType, size: bytes.length };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const registry = new Registry(options.image, options.plainHttp);

  const configBytes = await readFile(options.configPath);
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const meta = {
    configHash: `sha256:${sha256Hex(configBytes)}`,
    version:
      packageJson.dependencies?.["@datamitsu/datamitsu"] ??
      packageJson.devDependencies?.["@datamitsu/datamitsu"] ??
      "unknown",
  };

  const variantSpecs: Record<string, { libc: string; mapPath: string; tagSuffix: string }> = {
    alpine: { libc: "musl", mapPath: "docker/oci-map.alpine.json", tagSuffix: "-alpine" },
    debian: { libc: "glibc", mapPath: "docker/oci-map.json", tagSuffix: "" },
  };

  const bundleEntries: Descriptor[] = [];
  for (const variant of options.variants) {
    const spec = variantSpecs[variant];
    if (!spec) {
      throw new Error(`unknown variant ${variant}`);
    }
    const map = JSON.parse(await readFile(spec.mapPath, "utf8")) as OciMap;
    const tag = options.tag + spec.tagSuffix;
    console.log(`variant ${variant} (${spec.libc}): ${options.image}:${tag}`);

    const top = await registry.getManifest(tag);
    const platformManifests: { bytes: Buffer; platform: Descriptor["platform"] }[] = [];
    if (INDEX_TYPES.has(top.contentType)) {
      const index = JSON.parse(top.bytes.toString("utf8")) as { manifests: Descriptor[] };
      for (const descriptor of index.manifests) {
        // buildx attaches provenance/SBOM attestation manifests as
        // unknown/unknown platform entries — never store content.
        if (
          !descriptor.platform ||
          descriptor.platform.os === "unknown" ||
          descriptor.platform.architecture === "unknown"
        ) {
          continue;
        }
        const child = await registry.getManifest(descriptor.digest);
        platformManifests.push({ bytes: child.bytes, platform: descriptor.platform });
      }
    } else {
      // Single-platform push (local testing): assume the build host platform.
      platformManifests.push({
        bytes: top.bytes,
        platform: { architecture: process.arch === "x64" ? "amd64" : process.arch, os: "linux" },
      });
    }

    for (const { bytes, platform } of platformManifests) {
      console.log(`  platform ${platform?.os}/${platform?.architecture}`);
      const pushed = await annotateVariantManifest(registry, bytes, map, spec.libc, meta);
      bundleEntries.push({
        annotations: { [ANNOTATION_LIBC]: spec.libc },
        digest: pushed.digest,
        mediaType: pushed.mediaType,
        platform,
        size: pushed.size,
      });
    }
  }

  const bundleIndex = {
    annotations: {
      [ANNOTATION_CONFIG_HASH]: meta.configHash,
      [ANNOTATION_VERSION]: meta.version,
      "org.opencontainers.image.source": "https://github.com/shibanet0/datamitsu-config",
    },
    manifests: bundleEntries,
    mediaType: "application/vnd.oci.image.index.v1+json",
    schemaVersion: 2,
  };
  const indexBytes = Buffer.from(JSON.stringify(bundleIndex, undefined, 2));
  await registry.putManifest(options.bundleTag, indexBytes, bundleIndex.mediaType);
  const bundleDigest = `sha256:${sha256Hex(indexBytes)}`;

  const pin = `${options.image}@${bundleDigest}`;
  console.log(`\nbundle index pushed: ${options.image}:${options.bundleTag}`);
  console.log(`bundle digest:       ${bundleDigest}`);
  console.log(
    `\nPin it in the config:\n  oci: { ref: "${options.image}", digest: "${bundleDigest}" }`,
  );
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `bundle_ref=${pin}\nbundle_digest=${bundleDigest}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## OCI bundle\n\n\`${pin}\`\n\n\`\`\`ts\noci: { ref: "${options.image}", digest: "${bundleDigest}" }\n\`\`\`\n`,
    );
  }
}

function parseArgs(): {
  bundleTag: string;
  configPath: string;
  image: string;
  plainHttp: boolean;
  tag: string;
  variants: string[];
} {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    if (index === -1) {
      return undefined;
    }
    return args[index + 1];
  };
  const image = get("--image");
  const tag = get("--tag");
  const bundleTag = get("--bundle-tag");
  if (!image || !tag || !bundleTag) {
    console.error("Required: --image <host/repo> --tag <tag> --bundle-tag <tag>");
    process.exit(1);
  }
  return {
    bundleTag,
    configPath: get("--config") ?? "datamitsu.config.js",
    image,
    plainHttp: args.includes("--plain-http"),
    tag,
    variants: (get("--variants") ?? "debian,alpine").split(","),
  };
}

/**
 * Derives the hash-level subtree for a map entry by reading the layer's tar listing: the annotation
 * contract is `.bin/<app>/<hash>` while the COPY root in the map is `.bin/<app>` — the single child
 * directory observed in the layer supplies the `<hash>` segment.
 */
async function resolveSubtree(
  registry: Registry,
  layer: Descriptor,
  entry: OciMapEntry,
  storeRootRelative: string,
): Promise<string | undefined> {
  if (entry.kind === "uv-python") {
    return entry.subtree; // already exact, no hash segment
  }

  // A subtree layer opens with the directory chain down to the COPY root,
  // then its content — the matching entry appears within the first handful of
  // names, so the probe needs only the first kilobytes of the blob.
  const copyRoot = `${storeRootRelative}/${entry.subtree}/`;
  let child: string | undefined;
  await scanLayerEntries(registry, layer.digest, 16, (rawName) => {
    const name = rawName.replace(/^\.?\//, "");
    if (!name.startsWith(copyRoot)) {
      return false;
    }
    const segment = name.slice(copyRoot.length).split("/")[0];
    if (!segment) {
      return false;
    }
    child = segment;
    return true;
  });
  return child ? `${entry.subtree}/${child}` : undefined;
}

/**
 * Streams tar entry NAMES from a compressed layer blob. Stops the moment the caller returns true
 * from onEntry — the HTTP download is aborted, so only the first kilobytes of the blob are ever
 * fetched.
 */
async function scanLayerEntries(
  registry: Registry,
  digest: string,
  maxEntries: number,
  onEntry: (name: string) => boolean,
): Promise<void> {
  const { abort, stream } = await registry.blobStream(digest);

  const head: Buffer = await new Promise((resolve, reject) => {
    stream.once("readable", () => resolve(stream.read(4) ?? Buffer.alloc(0)));
    stream.once("error", reject);
  });
  stream.unshift(head);

  let decompressed: Readable;
  if (head[0] === 0x1f && head[1] === 0x8b) {
    decompressed = stream.pipe(createGunzip());
  } else if (head[0] === 0x28 && head[1] === 0xb5 && head[2] === 0x2f && head[3] === 0xfd) {
    decompressed = stream.pipe(createZstdDecompress());
  } else {
    decompressed = stream; // uncompressed tar
  }

  // Aborting the download mid-stream surfaces as async 'error' events on both
  // streams; without handlers Node treats them as crashes.
  stream.on("error", () => {});
  decompressed.on("error", () => {});

  let seen = 0;
  const parser = new TarNameParser((name) => {
    seen += 1;
    return onEntry(name) || seen >= maxEntries;
  });
  let done = false;
  try {
    for await (const chunk of decompressed) {
      if (parser.push(chunk as Buffer)) {
        done = true;
        abort();
        stream.destroy();
        decompressed.destroy();
        return;
      }
    }
  } catch (error) {
    // Tearing down an aborted download surfaces as a stream error; only
    // genuine mid-scan failures propagate.
    if (!done) {
      throw error;
    }
  }
}

function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

await main();
