import fsPromise from "node:fs/promises";
import path from "node:path";

export interface Blocklist {
  external: Record<string, BlocklistEntry>;
  github: Record<string, BlocklistEntry>;
  go: Record<string, BlocklistEntry>;
  node: Record<string, BlocklistEntry>;
  runtimes: Record<string, BlocklistEntry>;
  uv: Record<string, BlocklistEntry>;
}

// Type definitions
export interface BlocklistEntry {
  reason: string;
  replacement: string;
}

export interface ValidationError {
  packageName: string;
  reason: string;
  registry: string;
  replacement: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  success: boolean;
}

/**
 * Format validation errors into human-readable report
 */
export function formatErrorReport(errors: ValidationError[]): string {
  const lines: string[] = [
    "❌ Blocklist Validation Failed",
    "",
    `Found ${errors.length} blocked ${errors.length === 1 ? "package" : "packages"}:`,
    "",
  ];

  for (const error of errors) {
    lines.push(`  ${error.registry}/${error.packageName}`);
    lines.push(`    🚫 Reason: ${error.reason}`);
    lines.push(`    ✅ Use instead: ${error.replacement}`);
    lines.push("");
  }

  lines.push("To fix:");
  lines.push("1. Remove blocked packages from registry files");
  lines.push("2. Rebuild config: pnpm dm exec task -- build:datamitsu-config");
  lines.push("3. Run validator: pnpm dm exec task -- validate:blocklist");

  return lines.join("\n");
}

/**
 * Load blocklist from JSON file
 */
export async function loadBlocklist(blocklistPath: string): Promise<Blocklist> {
  const content = await fsPromise.readFile(blocklistPath, "utf8");
  const data: unknown = JSON.parse(content);

  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid blocklist format: expected object");
  }

  const blocklist = data as Blocklist;

  // Validate structure
  const requiredKeys = ["external", "node", "uv", "github", "runtimes"];
  for (const key of requiredKeys) {
    if (!(key in blocklist)) {
      throw new Error(`Invalid blocklist format: missing '${key}' section`);
    }
  }

  return blocklist;
}

/**
 * Main validation function
 */
export async function main(): Promise<void> {
  const registriesDir = path.join(import.meta.dirname, "../src/datamitsu-config/registries");
  const blocklistPath = path.join(registriesDir, "blocklist.json");

  // Load blocklist
  const blocklist = await loadBlocklist(blocklistPath);

  const allErrors: ValidationError[] = [];

  // Validate nodeVersions.json
  try {
    const nodePath = path.join(registriesDir, "nodeVersions.json");
    const nodeContent = await fsPromise.readFile(nodePath, "utf8");
    const nodeRegistry = JSON.parse(nodeContent) as Record<string, any>;
    const nodeErrors = validateNodeRegistry(nodeRegistry, blocklist.node);
    allErrors.push(...nodeErrors);
  } catch (error) {
    console.error("Error validating nodeVersions.json:", error);
    process.exit(1);
  }

  // Validate uvVersions.json
  try {
    const uvPath = path.join(registriesDir, "uvVersions.json");
    const uvContent = await fsPromise.readFile(uvPath, "utf8");
    const uvRegistry = JSON.parse(uvContent) as Record<string, any>;
    const uvErrors = validateUvRegistry(uvRegistry, blocklist.uv);
    allErrors.push(...uvErrors);
  } catch (error) {
    console.error("Error validating uvVersions.json:", error);
    process.exit(1);
  }

  // Validate githubApps.json
  try {
    const githubPath = path.join(registriesDir, "githubApps.json");
    const githubContent = await fsPromise.readFile(githubPath, "utf8");
    const githubRegistry = JSON.parse(githubContent) as {
      apps?: Record<string, any>;
      binaries?: Record<string, any>;
    };
    const githubErrors = validateGithubRegistry(githubRegistry, blocklist.github);
    allErrors.push(...githubErrors);
  } catch (error) {
    console.error("Error validating githubApps.json:", error);
    process.exit(1);
  }

  // Validate externalApps.json
  try {
    const externalPath = path.join(registriesDir, "externalApps.json");
    const externalContent = await fsPromise.readFile(externalPath, "utf8");
    const externalRegistry = JSON.parse(externalContent) as {
      apps?: Record<string, any>;
      binaries?: Record<string, any>;
    };
    const externalErrors = validateExternalRegistry(externalRegistry, blocklist.external);
    allErrors.push(...externalErrors);
  } catch (error) {
    console.error("Error validating externalApps.json:", error);
    process.exit(1);
  }

  // Validate runtimes.json
  try {
    const runtimesPath = path.join(registriesDir, "runtimes.json");
    const runtimesContent = await fsPromise.readFile(runtimesPath, "utf8");
    const runtimesRegistry = JSON.parse(runtimesContent) as Record<string, any>;
    const runtimesErrors = validateRuntimesRegistry(runtimesRegistry, blocklist.runtimes);
    allErrors.push(...runtimesErrors);
  } catch (error) {
    console.error("Error validating runtimes.json:", error);
    process.exit(1);
  }

  // Report results
  if (allErrors.length > 0) {
    console.error(formatErrorReport(allErrors));
    process.exit(1);
  }

  console.log("✅ Blocklist validation passed - no blocked packages found");
}

/**
 * Validate external apps registry against blocklist Checks both 'apps' and 'binaries' sections
 */
export function validateExternalRegistry(
  registry: { apps?: Record<string, any>; binaries?: Record<string, any> },
  blocklist: Record<string, BlocklistEntry>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (registry.apps && typeof registry.apps === "object") {
    for (const appName of Object.keys(registry.apps)) {
      const normalizedName = appName.toLowerCase();

      for (const [blockedName, entry] of Object.entries(blocklist)) {
        if (normalizedName === blockedName.toLowerCase()) {
          errors.push({
            packageName: appName,
            reason: entry.reason,
            registry: "external/apps",
            replacement: entry.replacement,
          });
        }
      }
    }
  }

  if (registry.binaries && typeof registry.binaries === "object") {
    for (const binaryName of Object.keys(registry.binaries)) {
      const normalizedName = binaryName.toLowerCase();

      for (const [blockedName, entry] of Object.entries(blocklist)) {
        if (normalizedName === blockedName.toLowerCase()) {
          errors.push({
            packageName: binaryName,
            reason: entry.reason,
            registry: "external/binaries",
            replacement: entry.replacement,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate GitHub apps registry against blocklist Checks both 'apps' and 'binaries' sections
 */
export function validateGithubRegistry(
  registry: { apps?: Record<string, any>; binaries?: Record<string, any> },
  blocklist: Record<string, BlocklistEntry>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate apps section
  if (registry.apps && typeof registry.apps === "object") {
    for (const appName of Object.keys(registry.apps)) {
      const normalizedName = appName.toLowerCase();

      for (const [blockedName, entry] of Object.entries(blocklist)) {
        if (normalizedName === blockedName.toLowerCase()) {
          errors.push({
            packageName: appName,
            reason: entry.reason,
            registry: "github/apps",
            replacement: entry.replacement,
          });
        }
      }
    }
  }

  // Validate binaries section
  if (registry.binaries && typeof registry.binaries === "object") {
    for (const binaryName of Object.keys(registry.binaries)) {
      const normalizedName = binaryName.toLowerCase();

      for (const [blockedName, entry] of Object.entries(blocklist)) {
        if (normalizedName === blockedName.toLowerCase()) {
          errors.push({
            packageName: binaryName,
            reason: entry.reason,
            registry: "github/binaries",
            replacement: entry.replacement,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate node (NPM) registry against blocklist
 */
export function validateNodeRegistry(
  registry: Record<string, any>,
  blocklist: Record<string, BlocklistEntry>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const packageName of Object.keys(registry)) {
    const normalizedName = packageName.toLowerCase();

    for (const [blockedName, entry] of Object.entries(blocklist)) {
      if (normalizedName === blockedName.toLowerCase()) {
        errors.push({
          packageName,
          reason: entry.reason,
          registry: "node",
          replacement: entry.replacement,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate runtimes registry against blocklist
 */
export function validateRuntimesRegistry(
  registry: Record<string, any>,
  blocklist: Record<string, BlocklistEntry>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const runtimeName of Object.keys(registry)) {
    const normalizedName = runtimeName.toLowerCase();

    for (const [blockedName, entry] of Object.entries(blocklist)) {
      if (normalizedName === blockedName.toLowerCase()) {
        errors.push({
          packageName: runtimeName,
          reason: entry.reason,
          registry: "runtimes",
          replacement: entry.replacement,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate uv (Python) registry against blocklist
 */
export function validateUvRegistry(
  registry: Record<string, any>,
  blocklist: Record<string, BlocklistEntry>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const packageName of Object.keys(registry)) {
    const normalizedName = packageName.toLowerCase();

    for (const [blockedName, entry] of Object.entries(blocklist)) {
      if (normalizedName === blockedName.toLowerCase()) {
        errors.push({
          packageName,
          reason: entry.reason,
          registry: "uv",
          replacement: entry.replacement,
        });
      }
    }
  }

  return errors;
}

// Direct run detection
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/validate-registry-blocklist.ts");

if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}
