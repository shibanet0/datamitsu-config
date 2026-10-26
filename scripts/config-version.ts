import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DATAMITSU_CONFIG_VERSION = "DATAMITSU_CONFIG_VERSION";
const RELEASE_VERSION_PATTERN = /^(?:\d[0-9A-Za-z.+-]*|core)$/;

export function resolveDatamitsuConfigVersion(
  env: NodeJS.ProcessEnv = process.env,
  packageVersion = readPackageVersion(),
): string {
  const value = env[DATAMITSU_CONFIG_VERSION];
  if (value === undefined) return "dev";
  if (value.length === 0 || value !== value.trim() || !RELEASE_VERSION_PATTERN.test(value)) {
    throw new Error(`${DATAMITSU_CONFIG_VERSION} must be a valid release version or 'core' label`);
  }
  if (value !== packageVersion) {
    throw new Error(
      `${DATAMITSU_CONFIG_VERSION} (${value}) does not match package.json (${packageVersion})`,
    );
  }
  return value;
}

function readPackageVersion(): string {
  const manifest: unknown = JSON.parse(
    readFileSync(resolve(import.meta.dirname, "../package.json"), "utf8"),
  );
  if (
    manifest &&
    typeof manifest === "object" &&
    "version" in manifest &&
    typeof manifest.version === "string"
  ) {
    return manifest.version;
  }
  throw new Error("package.json must contain a string version");
}
