/**
 * Docker image build wrapper.
 *
 * The generated Dockerfile COPYs `datamitsu.config.js`, but the build pipeline leaves only
 * `datamitsu.config.base.js` on disk — `build:datamitsu-config` removes the root
 * `datamitsu.config.js` so auto-discovery resolves the hand-written `.ts`. CI materializes it in a
 * dedicated step before the Docker build; this does the same locally: copy base ->
 * `datamitsu.config.js` for the build context, then remove it afterwards. Cleanup matters — a
 * lingering root `datamitsu.config.js` makes every later `pnpm dm ...` fail with "multiple config
 * files found".
 *
 * Usage: node scripts/docker-build.ts <amd64|arm64|alpine:amd64|alpine:arm64>
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

interface Target {
  file: string;
  platform: string;
  tag: string;
}

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE_CONFIG = path.join(ROOT, "datamitsu.config.base.js");
const MATERIALIZED = path.join(ROOT, "datamitsu.config.js");

const TARGETS: Record<string, Target> = {
  "alpine:amd64": {
    file: "docker/Dockerfile.alpine",
    platform: "linux/amd64",
    tag: "datamitsu-config:local-alpine-amd64",
  },
  "alpine:arm64": {
    file: "docker/Dockerfile.alpine",
    platform: "linux/arm64",
    tag: "datamitsu-config:local-alpine-arm64",
  },
  amd64: {
    file: "docker/Dockerfile",
    platform: "linux/amd64",
    tag: "datamitsu-config:local-amd64",
  },
  arm64: {
    file: "docker/Dockerfile",
    platform: "linux/arm64",
    tag: "datamitsu-config:local-arm64",
  },
};

const name = process.argv[2];
const target = name === undefined ? undefined : TARGETS[name];
if (!target) {
  console.error(`Usage: node scripts/docker-build.ts <${Object.keys(TARGETS).join("|")}>`);
  process.exit(1);
}
if (!existsSync(BASE_CONFIG)) {
  console.error("Missing datamitsu.config.base.js — run `pnpm build` first.");
  process.exit(1);
}

copyFileSync(BASE_CONFIG, MATERIALIZED);
try {
  execFileSync(
    "docker",
    [
      "buildx",
      "build",
      "--builder",
      "dm-config-local",
      "--platform",
      target.platform,
      "-f",
      target.file,
      "-t",
      target.tag,
      "--load",
      ".",
    ],
    { cwd: ROOT, stdio: "inherit" },
  );
} finally {
  rmSync(MATERIALIZED, { force: true });
}
