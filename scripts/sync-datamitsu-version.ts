import fsPromise from "node:fs/promises";
import path from "node:path";

// --- Types ---

export interface SyncResult {
  dockerfileAlpineUpdated: boolean;
  dockerfileUpdated: boolean;
  minVersionUpdated: boolean;
  skipped: boolean;
  skipReason?: string;
  version: string;
}

// --- Constants ---

const UNSTABLE_PATTERN = /^0\.0\.0-unstable\./;

const DOCKERFILE_FROM_REGEX = /^(FROM ghcr\.io\/datamitsu\/datamitsu:)([\w.-]+)((?:\s.*)?)$/m;

const MIN_VERSION_REGEX = /(return\s+")([\w.-]+)(")/;

// --- Exported functions (testable) ---

/**
 * Check if a version is unstable (0.0.0-unstable.*).
 */
export function isUnstableVersion(version: string): boolean {
  return UNSTABLE_PATTERN.test(version);
}

/**
 * Read the @datamitsu/datamitsu version from package.json.
 */
export async function readDatamitsuVersion(packageJsonPath: string): Promise<string> {
  const content = await fsPromise.readFile(packageJsonPath, "utf8");
  const pkg = JSON.parse(content) as {
    dependencies?: Record<string, string>;
  };

  const version = pkg.dependencies?.["@datamitsu/datamitsu"];
  if (!version) {
    throw new Error("Could not find @datamitsu/datamitsu in package.json dependencies");
  }
  return version;
}

/**
 * Main sync function. Returns what was changed.
 */
export async function syncDatamitsuVersion(rootDir: string): Promise<SyncResult> {
  const packageJsonPath = path.join(rootDir, "package.json");
  const dockerfilePath = path.join(rootDir, "docker/Dockerfile");
  const dockerfileAlpinePath = path.join(rootDir, "docker/Dockerfile.alpine");
  const configTsPath = path.join(rootDir, "src/datamitsu-config/datamitsu.config.ts");

  const version = await readDatamitsuVersion(packageJsonPath);

  if (isUnstableVersion(version)) {
    return {
      dockerfileAlpineUpdated: false,
      dockerfileUpdated: false,
      minVersionUpdated: false,
      skipped: true,
      skipReason: `Unstable version ${version} — skipping sync`,
      version,
    };
  }

  const dockerfileContent = await fsPromise.readFile(dockerfilePath, "utf8");
  const [updatedDockerfile, dockerfileUpdated] = updateDockerfileFromLine(
    dockerfileContent,
    version,
    false,
  );
  if (dockerfileUpdated) {
    await fsPromise.writeFile(dockerfilePath, updatedDockerfile, "utf8");
  }

  const dockerfileAlpineContent = await fsPromise.readFile(dockerfileAlpinePath, "utf8");
  const [updatedDockerfileAlpine, dockerfileAlpineUpdated] = updateDockerfileFromLine(
    dockerfileAlpineContent,
    version,
    true,
  );
  if (dockerfileAlpineUpdated) {
    await fsPromise.writeFile(dockerfileAlpinePath, updatedDockerfileAlpine, "utf8");
  }

  const configTsContent = await fsPromise.readFile(configTsPath, "utf8");
  const [updatedConfigTs, minVersionUpdated] = updateMinVersion(configTsContent, version);
  if (minVersionUpdated) {
    await fsPromise.writeFile(configTsPath, updatedConfigTs, "utf8");
  }

  return {
    dockerfileAlpineUpdated,
    dockerfileUpdated,
    minVersionUpdated,
    skipped: false,
    version,
  };
}

/**
 * Update a Dockerfile's FROM line with a new version.
 * Returns [updatedContent, wasChanged].
 */
export function updateDockerfileFromLine(
  content: string,
  version: string,
  isAlpine: boolean,
): [string, boolean] {
  const match = content.match(DOCKERFILE_FROM_REGEX);

  if (!match) {
    throw new Error("Could not find FROM ghcr.io/datamitsu/datamitsu:... line in Dockerfile");
  }

  const suffix = isAlpine ? "-alpine" : "";
  const expectedTag = `${version}${suffix}`;
  const currentTag = match[2];

  if (currentTag === expectedTag) {
    return [content, false];
  }

  const replaced = content.replace(DOCKERFILE_FROM_REGEX, `$1${expectedTag}$3`);
  return [replaced, true];
}

/**
 * Update the getMinVersion return value in datamitsu.config.ts.
 * Returns [updatedContent, wasChanged].
 */
export function updateMinVersion(content: string, version: string): [string, boolean] {
  const match = content.match(MIN_VERSION_REGEX);

  if (!match) {
    throw new Error('Could not find return "..." pattern in datamitsu.config.ts getMinVersion');
  }

  if (match[2] === version) {
    return [content, false];
  }

  const replaced = content.replace(MIN_VERSION_REGEX, `$1${version}$3`);
  return [replaced, true];
}

// --- Direct run ---

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/sync-datamitsu-version.ts");

if (isDirectRun) {
  try {
    const rootDir = path.join(import.meta.dirname, "..");
    const result = await syncDatamitsuVersion(rootDir);

    if (result.skipped) {
      console.log(result.skipReason);
    } else {
      const changes: string[] = [];
      if (result.dockerfileUpdated) {
        changes.push("docker/Dockerfile");
      }
      if (result.dockerfileAlpineUpdated) {
        changes.push("docker/Dockerfile.alpine");
      }
      if (result.minVersionUpdated) {
        changes.push("src/datamitsu-config/datamitsu.config.ts");
      }

      if (changes.length === 0) {
        console.log(`All files already in sync with version ${result.version}`);
      } else {
        console.log(`Synced version ${result.version} to: ${changes.join(", ")}`);
      }
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}
