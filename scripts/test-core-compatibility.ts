import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { fixtureEnvironment } from "../src/apps/test-support/env.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE_CONFIG = path.join(ROOT, "datamitsu.config.base.js");
const UNSUPPORTED_CORE = "0.5.1";
const RELEASE_SOURCE = `https://api.github.com/repos/datamitsu/datamitsu/releases/tags/v${UNSUPPORTED_CORE}`;

const base = await mkdtemp(path.join(tmpdir(), "datamitsu-core-compatibility-"));
try {
  const bundle = await readFile(BASE_CONFIG, "utf8");
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const architecture = { arm64: "arm64", x64: "amd64" }[process.arch];
  assert.ok(architecture, `Unsupported compatibility-smoke architecture: ${process.arch}`);
  const assetName = `datamitsu_${UNSUPPORTED_CORE}_${platform}_${architecture}${platform === "windows" ? ".exe" : ""}`;

  const response = await fetch(RELEASE_SOURCE);
  assert.ok(response.ok, `Cannot read the published core release: HTTP ${response.status}`);
  const release = (await response.json()) as {
    assets: { browser_download_url: string; digest: null | string; name: string }[];
  };
  const asset = release.assets.find(({ name }) => name === assetName);
  assert.ok(asset, `The published core release has no ${assetName}`);
  assert.match(asset.digest ?? "", /^sha256:[a-f0-9]{64}$/u);
  const download = await fetch(asset.browser_download_url);
  assert.ok(download.ok, `Cannot download ${assetName}: HTTP ${download.status}`);
  const binary = Buffer.from(await download.arrayBuffer());
  assert.equal(`sha256:${createHash("sha256").update(binary).digest("hex")}`, asset.digest);
  const executable = path.join(base, platform === "windows" ? "datamitsu.exe" : "datamitsu");
  await writeFile(executable, binary);
  await chmod(executable, 0o755);

  const cwd = path.join(base, "repo");
  await mkdir(cwd);
  const env = fixtureEnvironment({ DATAMITSU_CACHE_DIR: path.join(base, "cache") });
  execFileSync("git", ["init", "--quiet", cwd], { env });
  await writeFile(path.join(cwd, "datamitsu.config.js"), bundle);
  const result = spawnSync(executable, ["init"], { cwd, encoding: "utf8", env });
  assert.ifError(result.error);
  const output = result.stdout + result.stderr;
  assert.equal(result.status, 1, output);
  assert.match(output, /requires datamitsu v[\w.-]+ or higher/u);
  assert.ok(!output.includes("ReferenceError"), output);
  assert.ok(!output.includes("content() failed"), output);
  console.log(`Core ${UNSUPPORTED_CORE} rejects the built configuration before content callbacks.`);
} finally {
  await rm(base, { force: true, recursive: true });
}
