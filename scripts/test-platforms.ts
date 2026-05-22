import { execa } from "execa";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPORTS_DIR = path.join(ROOT, "test-reports");

// --- Docker images ---
const DOCKER_IMAGE_NODE = "node:26.2.0-trixie-slim";
const DOCKER_IMAGE_NODE_ALPINE = "node:26.2.0-alpine3.23";

// --- CLI args ---
const rawArgs = process.argv.slice(2);

const TARGET = rawArgs.find((a) => !a.startsWith("-")) as
  | "darwin"
  | "linux-amd64"
  | "linux-arm64"
  | undefined;

if (!TARGET || !["darwin", "linux-amd64", "linux-arm64"].includes(TARGET)) {
  console.error(
    "Usage: tsx scripts/test-platforms.ts <darwin|linux-amd64|linux-arm64> [--skip-passed] [--no-version-check]",
  );
  process.exit(1);
}

const skipPassed = rawArgs.includes("--skip-passed");
const noVersionCheck = rawArgs.includes("--no-version-check");

const extraVerifyArgs: string[] = [];
if (skipPassed) {
  extraVerifyArgs.push("--skip-passed");
}
if (noVersionCheck) {
  extraVerifyArgs.push("--no-version-check");
}

// --- Helpers ---

interface BinaryApp {
  name: string;
  platforms: PlatformStatus[];
  version: string;
}

interface LinuxOptions {
  cachePath: string;
  dockerPlatform: "linux/amd64" | "linux/arm64";
  storePath: string;
  variants: LinuxVariant[];
  version: string;
}

interface LinuxVariant {
  image: string;
  key: string;
}

interface ManagedRuntime {
  name: string;
  platforms: PlatformStatus[];
}

interface PlatformResult {
  data?: VerifyJsonData;
  error?: string;
  platform: string;
  success: boolean;
}

interface PlatformStatus {
  arch: string;
  error?: string;
  libc: string;
  os: string;
  status: "cached" | "failed" | "ok";
}

interface RuntimeApp {
  error?: string;
  kind: string;
  name: string;
  status: "cached" | "failed" | "ok";
  version: string;
}

interface VerifyJsonData {
  binaryApps: BinaryApp[];
  bundles: unknown[];
  currentPlatform: { arch: string; os: string };
  managedRuntimes: ManagedRuntime[];
  overallStatus: "failed" | "ok";
  runtimeApps: RuntimeApp[];
  summary: {
    binaryDownloads: { cached: number; failed: number; ok: number };
    bundleInstalls: { cached: number; failed: number; ok: number };
    runtimeDownloads: { cached: number; failed: number; ok: number };
    runtimeInstalls: { cached: number; failed: number; ok: number };
    versionChecks: {
      cached: number;
      execFailed: number;
      mismatch: number;
      ok: number;
      parseFailed: number;
      skipped: number;
    };
  };
  versionChecks: VersionCheck[];
}

interface VersionCheck {
  actual?: string;
  args: string[];
  error?: string;
  expected?: string;
  name: string;
  status: "exec_failed" | "mismatch" | "ok" | "parse_failed";
}

// --- Helper functions for report generation ---

function buildReport(results: PlatformResult[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [`# Platform Verification Report — ${date}`, ""];

  if (results.length === 0) {
    lines.push("_No test results available._", "");
    return lines.join("\n");
  }

  // Collect platform keys (column headers)
  const platforms = results.map((r) => r.platform).sort();

  // --- Binary Applications Matrix ---
  const allBinaryApps = new Set<string>();
  const binaryStatusMap = new Map<string, Map<string, PlatformStatus | undefined>>();

  for (const result of results) {
    if (result.data) {
      for (const app of result.data.binaryApps) {
        allBinaryApps.add(app.name);

        if (!binaryStatusMap.has(app.name)) {
          binaryStatusMap.set(app.name, new Map());
        }

        const platformStatus = findPlatformStatus(app, result.platform);
        binaryStatusMap.get(app.name)!.set(result.platform, platformStatus);
      }
    }
  }

  if (allBinaryApps.size > 0) {
    lines.push("## Binary Applications", "");
    lines.push(`| App | ${platforms.join(" | ")} |`);
    lines.push(`|-----|${platforms.map(() => "---").join("|")}|`);

    for (const app of [...allBinaryApps].sort()) {
      const cells = platforms.map((platform) => {
        const status = binaryStatusMap.get(app)?.get(platform);
        return formatStatus(status);
      });
      lines.push(`| ${app} | ${cells.join(" | ")} |`);
    }

    lines.push("", `_(${allBinaryApps.size} binary apps total)_`, "");
  }

  // --- Managed Runtimes Matrix ---
  const allManagedRuntimes = new Set<string>();
  const runtimeStatusMap = new Map<string, Map<string, PlatformStatus | undefined>>();

  for (const result of results) {
    if (result.data) {
      for (const runtime of result.data.managedRuntimes) {
        allManagedRuntimes.add(runtime.name);

        if (!runtimeStatusMap.has(runtime.name)) {
          runtimeStatusMap.set(runtime.name, new Map());
        }

        const platformStatus = findPlatformStatus(runtime, result.platform);
        runtimeStatusMap.get(runtime.name)!.set(result.platform, platformStatus);
      }
    }
  }

  if (allManagedRuntimes.size > 0) {
    lines.push("## Managed Runtimes", "");
    lines.push(`| Runtime | ${platforms.join(" | ")} |`);
    lines.push(`|---------|${platforms.map(() => "---").join("|")}|`);

    for (const runtime of [...allManagedRuntimes].sort()) {
      const cells = platforms.map((platform) => {
        const status = runtimeStatusMap.get(runtime)?.get(platform);
        return formatStatus(status);
      });
      lines.push(`| ${runtime} | ${cells.join(" | ")} |`);
    }

    lines.push("");
  }

  // --- Runtime Applications Matrix ---
  const allRuntimeApps = new Set<string>();
  const runtimeAppMap = new Map<
    string,
    { kind: string; statuses: Map<string, RuntimeApp | undefined> }
  >();

  for (const result of results) {
    if (result.data) {
      for (const app of result.data.runtimeApps) {
        allRuntimeApps.add(app.name);

        if (!runtimeAppMap.has(app.name)) {
          runtimeAppMap.set(app.name, { kind: app.kind, statuses: new Map() });
        }

        runtimeAppMap.get(app.name)!.statuses.set(result.platform, app);
      }
    }
  }

  if (allRuntimeApps.size > 0) {
    lines.push("## Runtime Applications", "");
    lines.push(`| App | Kind | ${platforms.join(" | ")} |`);
    lines.push(`|-----|------|${platforms.map(() => "---").join("|")}|`);

    for (const appName of [...allRuntimeApps].sort()) {
      const appData = runtimeAppMap.get(appName)!;
      const cells = platforms.map((platform) => {
        const app = appData.statuses.get(platform);
        if (!app) {
          return "—";
        }
        if (app.status === "cached" || app.status === "ok") {
          return app.version ? `✓ ${app.version}` : "✓";
        }
        if (app.error) {
          const truncated = app.error.length > 40 ? app.error.slice(0, 40) + "..." : app.error;
          return `✗ ${truncated}`;
        }
        return "✗";
      });
      lines.push(`| ${appName} | ${appData.kind} | ${cells.join(" | ")} |`);
    }

    lines.push("");
  }

  // --- Version Checks Matrix ---
  const allVersionChecks = new Set<string>();
  const versionCheckMap = new Map<string, Map<string, undefined | VersionCheck>>();

  for (const result of results) {
    if (result.data) {
      for (const check of result.data.versionChecks) {
        allVersionChecks.add(check.name);

        if (!versionCheckMap.has(check.name)) {
          versionCheckMap.set(check.name, new Map());
        }

        versionCheckMap.get(check.name)!.set(result.platform, check);
      }
    }
  }

  if (allVersionChecks.size > 0) {
    lines.push("## Version Checks", "");
    lines.push(`| App | ${platforms.join(" | ")} |`);
    lines.push(`|-----|${platforms.map(() => "---").join("|")}|`);

    for (const appName of [...allVersionChecks].sort()) {
      const cells = platforms.map((platform) => {
        const check = versionCheckMap.get(appName)?.get(platform);
        if (!check) {
          return "—";
        }
        if (check.status === "ok") {
          return check.actual ? `✓ ${check.actual}` : "✓";
        }
        if (check.error) {
          const truncated =
            check.error.length > 40 ? check.error.slice(0, 40) + "..." : check.error;
          return `✗ ${truncated}`;
        }
        return `✗ ${check.status}`;
      });
      lines.push(`| ${appName} | ${cells.join(" | ")} |`);
    }

    lines.push("");
  }

  // --- Summary Section ---
  lines.push("## Summary", "");
  lines.push(
    "| Platform | Overall | Binary Downloads | Runtime Downloads | Runtime Installs | Version Checks |",
  );
  lines.push(
    "|----------|---------|------------------|-------------------|------------------|----------------|",
  );

  for (const platform of platforms) {
    const result = results.find((r) => r.platform === platform);
    if (!result || !result.data) {
      lines.push(`| ${platform} | ✗ ERROR | — | — | — | — |`);
    } else {
      const { overallStatus, summary } = result.data;
      const overall = overallStatus === "ok" ? "✓ OK" : "✗ FAILED";

      const binaryDl = formatCount(
        summary.binaryDownloads.ok,
        summary.binaryDownloads.cached,
        summary.binaryDownloads.failed,
      );
      const runtimeDl = formatCount(
        summary.runtimeDownloads.ok,
        summary.runtimeDownloads.cached,
        summary.runtimeDownloads.failed,
      );
      const runtimeInst = formatCount(
        summary.runtimeInstalls.ok,
        summary.runtimeInstalls.cached,
        summary.runtimeInstalls.failed,
      );
      let versionCh = "—";
      if (summary.versionChecks.ok + summary.versionChecks.execFailed > 0) {
        versionCh =
          summary.versionChecks.execFailed === 0
            ? `${summary.versionChecks.ok}✓`
            : `${summary.versionChecks.ok}✓ ${summary.versionChecks.execFailed}✗`;
      }

      lines.push(
        `| ${platform} | ${overall} | ${binaryDl} | ${runtimeDl} | ${runtimeInst} | ${versionCh} |`,
      );
    }
  }

  lines.push("");

  // --- Legend ---
  lines.push(
    "---",
    "",
    "**Legend:**",
    "- ✓ = Success (cached or ok)",
    "- ✗ = Failed (with brief error message)",
    "- — = Not tested on this platform",
    "",
  );

  return lines.join("\n");
}

function findPlatformStatus(
  app: BinaryApp | ManagedRuntime,
  targetPlatformKey: string,
): PlatformStatus | undefined {
  // Parse target platform key (e.g., "linux-amd64-glibc" or "darwin-arm64")
  const parts = targetPlatformKey.split("-");
  const targetOs = parts[0];
  const targetArch = parts[1];
  const targetLibc = parts[2] || "unknown";

  // Find matching platform in app.platforms[]
  return app.platforms.find(
    (p) =>
      p.os === targetOs &&
      p.arch === targetArch &&
      (targetLibc === "unknown" || p.libc === targetLibc),
  );
}

function formatCount(ok: number, cached: number, failed: number): string {
  const total = ok + cached + failed;
  if (total === 0) {
    return "—";
  }
  const success = ok + cached;
  if (failed === 0) {
    return `${success}✓`;
  }
  return `${success}✓ ${failed}✗`;
}

function formatStatus(status: PlatformStatus | undefined): string {
  if (!status) {
    return "—";
  }

  if (status.status === "cached" || status.status === "ok") {
    return "✓";
  }

  // Failed status
  if (status.error) {
    const truncated = status.error.length > 50 ? status.error.slice(0, 50) + "..." : status.error;
    return `✗ ${truncated}`;
  }

  return "✗";
}

async function getDmVersion(): Promise<string> {
  const raw = await readFile(path.join(ROOT, "package.json"), "utf8");
  const pkg = JSON.parse(raw) as { dependencies?: Record<string, string> };
  // cspell:ignore datamitsu
  const ver = pkg.dependencies?.["@datamitsu/datamitsu"]; // cspell:disable-line
  if (!ver) {
    throw new Error("@datamitsu/datamitsu not found in dependencies");
  } // cspell:disable-line
  return ver;
}

// --- Report builder ---

async function loadAllResults(): Promise<PlatformResult[]> {
  const results: PlatformResult[] = [];

  try {
    const files = await readdir(REPORTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json") && f !== "report.md");

    for (const file of jsonFiles) {
      try {
        const content = await readFile(path.join(REPORTS_DIR, file), "utf8");
        const parsed = JSON.parse(content);
        const platform = file.replace(".json", ""); // e.g., "linux-amd64-glibc"

        // Check if this is a valid VerifyJsonData structure
        if (
          parsed.binaryApps &&
          parsed.managedRuntimes &&
          parsed.runtimeApps &&
          parsed.versionChecks
        ) {
          const data = parsed as VerifyJsonData;
          results.push({
            data,
            platform,
            success: data.overallStatus === "ok",
          });
        } else if (parsed.error) {
          // JSON contains only error information
          results.push({
            error: parsed.error as string,
            platform,
            success: false,
          });
        } else {
          console.warn(`Skipping ${file}: invalid structure`);
        }
      } catch (error) {
        console.warn(`Failed to load ${file}:`, error);
      }
    }
  } catch {
    // Directory doesn't exist or is empty
  }

  return results;
}

async function main() {
  await mkdir(REPORTS_DIR, { recursive: true });

  // Regenerate report from existing JSONs on startup
  console.log("Regenerating report from existing results...");
  await regenerateReport();

  console.log(`Target: ${TARGET}`);

  let results: PlatformResult[] = [];

  if (TARGET === "darwin") {
    results = [await runNativeDarwin()];
  } else {
    console.log("Getting dm version...");
    const version = await getDmVersion();
    console.log(`  version: ${version}`);

    const storePath = path.join(ROOT, "store");
    const cachePath = path.join(ROOT, "cache");
    console.log(`Using store path: ${storePath}`);
    console.log(`Using cache path: ${cachePath}`);

    const archLabel = TARGET === "linux-amd64" ? "amd64" : "arm64";
    const dockerPlatform = TARGET === "linux-amd64" ? "linux/amd64" : "linux/arm64";

    results = await runLinux({
      cachePath,
      dockerPlatform,
      storePath,
      variants: [
        { image: DOCKER_IMAGE_NODE, key: `linux-${archLabel}-glibc` },
        { image: DOCKER_IMAGE_NODE_ALPINE, key: `linux-${archLabel}-musl` },
      ],
      version,
    });
  }

  // Save individual JSONs and regenerate report after each
  for (const r of results) {
    await writeFile(
      path.join(REPORTS_DIR, `${r.platform}.json`),
      JSON.stringify(r.data ?? { error: r.error }, null, 2),
    );

    // Regenerate report after each JSON write
    await regenerateReport();
  }

  // Print summary
  console.log("\n## Summary");
  for (const r of results) {
    console.log(`  ${r.success ? "✓" : "✗"} ${r.platform}`);
  }
  console.log(`\nReport: test-reports/report.md`);
}

async function regenerateReport(): Promise<void> {
  const results = await loadAllResults();

  if (results.length === 0) {
    console.log("No test results found, skipping report generation");
    return;
  }

  const reportContent = buildReport(results);
  await writeFile(path.join(REPORTS_DIR, "report.md"), reportContent);
  console.log(`Report regenerated from ${results.length} platform(s)`);
}

async function runLinux(opts: LinuxOptions): Promise<PlatformResult[]> {
  const { cachePath, dockerPlatform, storePath, variants, version } = opts;
  const configPath = path.join(ROOT, "datamitsu.config.js");
  const containerStore = "/root/.cache/datamitsu"; // cspell:disable-line
  const containerCache = "/root/.cache/datamitsu-cache"; // cspell:disable-line

  const results: PlatformResult[] = [];

  // Ensure store and cache directories exist
  await mkdir(storePath, { recursive: true });
  await mkdir(cachePath, { recursive: true });

  for (const v of variants) {
    console.log(`\n▶ ${v.key} (docker ${v.image})`);

    const verifyCmd = [
      "npx",
      "--yes",
      `@datamitsu/datamitsu@${version}`, // cspell:disable-line
      "--before-config",
      "/workspace/datamitsu.config.js", // cspell:disable-line
      "devtools",
      "verify-all",
      "--json",
      ...extraVerifyArgs,
    ].join(" ");

    try {
      const stdout = await runWithOutput(
        "docker",
        [
          "run",
          "--rm",
          "--platform",
          dockerPlatform,
          "-e",
          "DATAMITSU_LOG_LEVEL=debug", // cspell:disable-line
          "-v",
          `${configPath}:/workspace/datamitsu.config.js:ro`, // cspell:disable-line
          "-v",
          `${storePath}:${containerStore}`,
          "-v",
          `${cachePath}-${v.key}:${containerCache}`,
          v.image,
          "sh",
          "-c",
          verifyCmd,
        ],
        ROOT,
      );
      results.push({
        data: JSON.parse(stdout),
        platform: v.key,
        success: true,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ ${msg}`);
      results.push({ error: msg, platform: v.key, success: false });
    }
  }

  return results;
}

async function runNativeDarwin(): Promise<PlatformResult> {
  const arch = process.arch === "arm64" ? "arm64" : "amd64";
  const platform = `darwin-${arch}`;
  console.log(`\n▶ ${platform} (native)`);
  try {
    const stdout = await runWithOutput(
      "pnpm",
      ["--silent", "dm", "devtools", "verify-all", "--json", ...extraVerifyArgs],
      ROOT,
    );
    return { data: JSON.parse(stdout), platform, success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ ${msg}`);
    return { error: msg, platform, success: false };
  }
}

// --- Main ---

// Track running processes for cleanup on interruption
const runningProcesses = new Set<ReturnType<typeof execa>>();

// Handle interruption signals
async function cleanup() {
  console.log("\n\nInterrupted! Cleaning up...");

  // Kill all running processes
  for (const proc of runningProcesses) {
    try {
      proc.kill("SIGTERM", { forceKillAfterTimeout: 2000 });
    } catch {
      // Ignore errors during cleanup
    }
  }

  // Stop any remaining Docker containers
  try {
    await execa("docker", ["ps", "-q", "--filter", `ancestor=${DOCKER_IMAGE_NODE}`], {
      reject: false,
    });
    await execa("docker", ["ps", "-q", "--filter", `ancestor=${DOCKER_IMAGE_NODE_ALPINE}`], {
      reject: false,
    });
    const nodeContainers = await execa("docker", [
      "ps",
      "-q",
      "--filter",
      `ancestor=${DOCKER_IMAGE_NODE}`,
    ]);
    const alpineContainers = await execa("docker", [
      "ps",
      "-q",
      "--filter",
      `ancestor=${DOCKER_IMAGE_NODE_ALPINE}`,
    ]);

    const containerIds = [
      ...nodeContainers.stdout.split("\n").filter((id) => id.trim()),
      ...alpineContainers.stdout.split("\n").filter((id) => id.trim()),
    ];

    if (containerIds.length > 0) {
      console.log(`Stopping ${containerIds.length} Docker container(s)...`);
      await execa("docker", ["stop", ...containerIds], { reject: false, timeout: 5000 });
    }
  } catch {
    // Ignore errors during Docker cleanup
  }

  process.exit(130); // 128 + SIGINT (2)
}

/** Run a command, stream stdout+stderr to terminal, return captured stdout. */
async function runWithOutput(file: string, args: string[], cwd: string): Promise<string> {
  const proc = execa(file, args, {
    cwd,
    env: { ...process.env, DATAMITSU_LOG_LEVEL: "debug" }, // cspell:disable-line
    reject: false,
    stderr: "inherit",
    stdout: "pipe",
  });

  // Track this process
  runningProcesses.add(proc);

  const chunks: Buffer[] = [];
  proc.stdout?.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
    process.stdout.write(chunk);
  });

  try {
    const result = await proc;
    if (result.exitCode !== 0) {
      throw new Error(`Command failed with exit code ${result.exitCode}`);
    }
    return Buffer.concat(chunks).toString();
  } finally {
    // Remove from tracking when done
    runningProcesses.delete(proc);
  }
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

try {
  await main();
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
}
