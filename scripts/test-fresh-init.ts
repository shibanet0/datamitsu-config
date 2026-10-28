/**
 * Fresh-init smoke test.
 *
 * Proves a brand-new consumer repo can adopt the _locally built_ config and run the full onboarding
 * — `datamitsu init` -> `config reconcile` -> `check` — without errors. This catches regressions
 * where a config change breaks a from-scratch project (e.g. an invalid scaffolded
 * pnpm-workspace.yaml, a broken managed-config chain hash, or a tool that fails on an empty tree).
 *
 * How it works, and two deliberate choices:
 *
 * 1. Both entry paths. First copy the built bundle as the auto-discovered config and initialize it
 *    without wrapper flags. Then use getBeforeConfigs() to exercise layer inheritance before
 *    reconcile/check, skipping only prose tools without project dictionaries and knip without a
 *    source tree. The separate compatibility smoke checks an unsupported stable binary.
 * 2. Isolated pnpm store. `datamitsu config reconcile`/`init` patch files inside the temp repo's
 *    node_modules, which hard-link into whatever pnpm store the install used. Pointing the store at
 *    a throwaway dir (npm_config_store_dir) keeps those writes off the developer's global store —
 *    otherwise a local run would poison it for every other repo. In CI the store is ephemeral, so
 *    this is a no-op there.
 *
 * Note: the temp repo is driven with a bare `pnpm exec datamitsu` on purpose. Unlike the `pnpm dm`
 * wrapper (which passes `--before-config`, and thereby makes datamitsu ignore
 * `getBeforeConfigs()`), the raw binary auto-discovers the fixture config and honours its declared
 * before-config. That is the whole point.
 *
 * Usage: node scripts/test-fresh-init.ts [--keep] [--verbose]
 */
import { execa } from "execa";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { fixtureEnvironment } from "../src/apps/test-support/env.ts";
import { readDatamitsuVersion } from "./sync-datamitsu-version.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE_CONFIG = path.join(ROOT, "datamitsu.config.base.js");

// Tools a from-scratch repo has nothing to feed yet: prose/spell linters without
// project dictionaries (vale, harper-cli, cspell) and knip (no src/ tree). They
// are reported as skipped in the fixture, not silently omitted.
const SKIP_TOOLS = ["vale", "harper-cli", "cspell", "knip"];

const args = new Set(process.argv.slice(2));
const KEEP = args.has("--keep");
const VERBOSE = args.has("--verbose");

interface StepResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function fixtureConfig(baseRelPath: string): string {
  const skipEntries = SKIP_TOOLS.map(
    (name) =>
      `      ${JSON.stringify(name)}: { ...(config.tools && config.tools[${JSON.stringify(name)}]), ...skip },`,
  ).join("\n");
  // Inherit the built base config by relative path; layer skips for tools an
  // empty project cannot satisfy yet.
  return `function getBeforeConfigs() {
  return [{ path: ${JSON.stringify(baseRelPath)} }];
}
globalThis.getBeforeConfigs = getBeforeConfigs;

function getConfig(config) {
  const skip = { skip: true, skipReason: "not configured in fresh-init fixture" };
  return {
    ...config,
    tools: {
      ...config.tools,
${skipEntries}
    },
  };
}
globalThis.getConfig = getConfig;

function getMinVersion() {
  return "0.0.0";
}
globalThis.getMinVersion = getMinVersion;
`;
}

async function readDmVersion(): Promise<string> {
  return readDatamitsuVersion(await readFile(path.join(ROOT, "pnpm-workspace.yaml"), "utf8"));
}

const runningProcesses = new Set<ReturnType<typeof execa>>();

function assertOk(label: string, r: StepResult): void {
  if (r.exitCode === 0) {
    console.log(`  ✓ ${label} (exit 0)`);
    return;
  }
  if (!VERBOSE) {
    process.stdout.write(r.stdout);
    process.stderr.write(r.stderr);
  }
  throw new Error(`${label} failed with exit code ${r.exitCode}`);
}

async function cleanup(): Promise<void> {
  for (const proc of runningProcesses) {
    try {
      proc.kill("SIGTERM");
    } catch {
      // ignore
    }
  }
  process.exit(130);
}

async function main(): Promise<void> {
  if (!(await exists(BASE_CONFIG))) {
    throw new Error(`Missing ${path.relative(ROOT, BASE_CONFIG)} — run \`pnpm build\` first.`);
  }
  const version = await readDmVersion();
  console.log(`Fresh-init smoke test · @datamitsu/datamitsu@${version}`); // cspell:disable-line

  // repo/ and store/ are siblings under one temp root: same filesystem (so the
  // store's hard links into node_modules work), but the store lives OUTSIDE the
  // repo tree so gitleaks & friends never scan the dependency CAS (its fixtures
  // carry decoy secrets that would fail the check).
  const base = await mkdtemp(path.join(tmpdir(), "datamitsu-fresh-init-"));
  const work = path.join(base, "repo");
  const storeDir = path.join(base, "store");
  await mkdir(work, { recursive: true });
  await mkdir(storeDir, { recursive: true });
  // Isolated store keeps reconcile/init's node_modules patches off the global store.
  const env = fixtureEnvironment({ npm_config_store_dir: storeDir });

  try {
    await writeFile(
      path.join(work, "package.json"),
      JSON.stringify(
        { name: "fresh-init-fixture", private: true, type: "module", version: "0.0.0" },
        null,
        2,
      ) + "\n",
    );
    // Acknowledge esbuild's (unused) native build so the initial install does not
    // error under ERR_PNPM_IGNORED_BUILDS; storeDir is redundant with the env var
    // but harmless before reconcile overwrites this file.
    await writeFile(
      path.join(work, "pnpm-workspace.yaml"),
      `allowBuilds:\n  esbuild: false\nstoreDir: ${storeDir}\n`,
    );
    await copyFile(BASE_CONFIG, path.join(work, "datamitsu.config.js"));
    // The fixture installs the pinned core into node_modules. Its Go toolchain can temporarily
    // carry newly disclosed vulnerabilities before the next core build; that is not consumer code
    // and must not make this configuration onboarding smoke depend on the core's release cadence.
    await writeFile(path.join(work, ".datamitsuignore"), "**/*: grype\n");

    await run("git init", "git", ["init", "-q"], work, env);
    await run("git config", "git", ["config", "user.email", "fresh-init@example.com"], work, env);
    await run("git config", "git", ["config", "user.name", "Fresh Init"], work, env);
    await run("git config", "git", ["config", "commit.gpgsign", "false"], work, env); // cspell:disable-line
    await run("git add", "git", ["add", "-A"], work, env);
    await run("git commit", "git", ["commit", "-qm", "chore: init fixture"], work, env);

    assertOk(
      "install",
      await run("install", "pnpm", ["add", "-D", `@datamitsu/datamitsu@${version}`], work, env),
    ); // cspell:disable-line
    assertOk("init", await run("datamitsu init", "pnpm", ["exec", "datamitsu", "init"], work, env));
    await writeFile(path.join(work, "datamitsu.config.js"), fixtureConfig(BASE_CONFIG));
    assertOk(
      "layered init",
      await run("layered datamitsu init", "pnpm", ["exec", "datamitsu", "init"], work, env),
    );
    assertOk(
      "reconcile",
      await run(
        "datamitsu config reconcile",
        "pnpm",
        ["exec", "datamitsu", "config", "reconcile"],
        work,
        env,
      ),
    );
    await run("git add", "git", ["add", "-A"], work, env);
    await run(
      "git commit",
      "git",
      ["commit", "-qm", "chore: datamitsu config reconcile"],
      work,
      env,
    );
    assertOk(
      "check",
      await run("datamitsu check", "pnpm", ["exec", "datamitsu", "check"], work, env),
    );

    // Sanity-check a representative slice of the scaffold actually landed.
    const expected = [
      ".datamitsu",
      "eslint.config.mjs",
      "lefthook.yaml",
      "AGENTS.md",
      "prettier.config.mjs",
    ];
    for (const name of expected) {
      if (!(await exists(path.join(work, name)))) {
        throw new Error(`expected reconcile to scaffold ${name}, but it is missing`);
      }
    }
    console.log(`  ✓ scaffold present (${expected.join(", ")})`);

    // Create-missing: a subproject newly added to the monorepo is provisioned
    // by `config reconcile --create-missing` — its missing configs are
    // created, and every existing file stays byte-for-byte untouched.
    await mkdir(path.join(work, "packages", "demo"), { recursive: true });
    await writeFile(
      path.join(work, "packages", "demo", "package.json"),
      JSON.stringify({ name: "demo", private: true }) + "\n",
    );
    const ensure = await run(
      "create-missing",
      "pnpm",
      ["exec", "datamitsu", "config", "reconcile", "--create-missing", "--json"],
      work,
      env,
      { captureStdout: true },
    );
    assertOk("create-missing", ensure);
    const ensureDoc = JSON.parse(ensure.stdout) as {
      counts: { created: number; failed: number };
      createMissing: boolean;
    };
    if (
      !ensureDoc.createMissing ||
      ensureDoc.counts.created <= 0 ||
      ensureDoc.counts.failed !== 0
    ) {
      throw new Error(
        `create-missing did not provision packages/demo: ${JSON.stringify(ensureDoc.counts)}`,
      );
    }
    const demoConfig = path.join(work, "packages", "demo", "eslint.config.mjs");
    if (!(await exists(demoConfig))) {
      throw new Error("create-missing did not create packages/demo/eslint.config.mjs");
    }
    console.log("  ✓ create-missing provisioned packages/demo");

    // The safety contract, exercised: a customized file survives a re-run,
    // and the idempotent second run creates nothing.
    await writeFile(demoConfig, "// mine\n");
    const ensureAgain = await run(
      "create-missing idempotent",
      "pnpm",
      ["exec", "datamitsu", "config", "reconcile", "--create-missing", "--json"],
      work,
      env,
      { captureStdout: true },
    );
    assertOk("create-missing idempotent", ensureAgain);
    const againDoc = JSON.parse(ensureAgain.stdout) as {
      counts: { created: number; failed: number; skippedExisting: number };
    };
    if (againDoc.counts.created !== 0 || againDoc.counts.failed !== 0) {
      throw new Error(
        `create-missing re-run was not idempotent: ${JSON.stringify(againDoc.counts)}`,
      );
    }
    if (againDoc.counts.skippedExisting <= 0) {
      throw new Error("create-missing re-run reported no skipped-existing files");
    }
    if ((await readFile(demoConfig, "utf8")) !== "// mine\n") {
      throw new Error("create-missing rewrote a customized config file");
    }
    console.log("  ✓ create-missing idempotent and left existing files untouched");

    console.log("\n✓ fresh-init smoke test passed");
  } finally {
    if (KEEP) {
      console.log(`\n(kept fixture at ${work})`);
    } else {
      await rm(base, { force: true, recursive: true });
    }
  }
}

async function run(
  label: string,
  file: string,
  cmdArgs: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  // Machine-readable consumers parse stdout, so a --json call must capture it
  // even under --verbose, whose default pipes inherited streams through.
  opts?: { captureStdout?: boolean },
): Promise<StepResult> {
  console.log(`\n▶ ${label}: ${file} ${cmdArgs.join(" ")}`);
  const proc = execa(file, cmdArgs, {
    cwd,
    env,
    // A SIGTERM from cleanup() escalates to SIGKILL after this long.
    forceKillAfterDelay: 2000,
    reject: false,
    stderr: VERBOSE ? "inherit" : "pipe",
    stdout: VERBOSE && !opts?.captureStdout ? "inherit" : "pipe",
  });
  runningProcesses.add(proc);
  try {
    const result = await proc;
    return {
      exitCode: result.exitCode ?? 1,
      stderr: result.stderr ?? "",
      stdout: result.stdout ?? "",
    };
  } finally {
    runningProcesses.delete(proc);
  }
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

try {
  await main();
} catch (error: unknown) {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
