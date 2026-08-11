/**
 * Fresh-init smoke test.
 *
 * Proves a brand-new consumer repo can adopt the _locally built_ config and run the full onboarding
 * — `datamitsu init` -> `setup` -> `check` — without errors. This catches regressions where a
 * config change breaks a from-scratch project (e.g. an invalid scaffolded pnpm-workspace.yaml, a
 * broken setup chain hash, or a tool that fails on an empty tree).
 *
 * How it works, and two deliberate choices:
 *
 * 1. Inheritance, not copying. The temp repo's own datamitsu.config.js declares `getBeforeConfigs()`
 *    pointing at this repo's datamitsu.config.base.js by a relative path. That exercises the real
 *    config-inheritance path a consumer uses, with no npm pack / install of the config package. It
 *    also lets the fixture layer `skip: true` onto prose/spell tools that a fresh project has not
 *    configured yet (vale, harper-cli, cspell) and knip (no source tree).
 * 2. Isolated pnpm store. `datamitsu setup`/`init` patch files inside the temp repo's node_modules,
 *    which hard-link into whatever pnpm store the install used. Pointing the store at a throwaway
 *    dir (npm_config_store_dir) keeps those writes off the developer's global store — otherwise a
 *    local run would poison it for every other repo. In CI the store is ephemeral, so this is a
 *    no-op there.
 *
 * Note: the temp repo is driven with a bare `pnpm exec datamitsu` on purpose. Unlike the `pnpm dm`
 * wrapper (which passes `--before-config`, and thereby makes datamitsu ignore
 * `getBeforeConfigs()`), the raw binary auto-discovers the fixture config and honours its declared
 * before-config. That is the whole point.
 *
 * Usage: node scripts/test-fresh-init.ts [--keep] [--verbose]
 */
import { execa } from "execa";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

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
  const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };
  const version = pkg.dependencies?.["@datamitsu/datamitsu"]; // cspell:disable-line
  if (!version) {
    throw new Error("@datamitsu/datamitsu not found in dependencies"); // cspell:disable-line
  }
  return version;
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
      proc.kill("SIGTERM", { forceKillAfterTimeout: 2000 });
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
  // Isolated store keeps setup/init's node_modules patches off the global store.
  const env: NodeJS.ProcessEnv = { ...process.env, npm_config_store_dir: storeDir };

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
    // but harmless before setup overwrites this file.
    await writeFile(
      path.join(work, "pnpm-workspace.yaml"),
      `allowBuilds:\n  esbuild: false\nstoreDir: ${storeDir}\n`,
    );
    await writeFile(
      path.join(work, "datamitsu.config.js"),
      fixtureConfig(path.relative(work, BASE_CONFIG)),
    );

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
    assertOk(
      "setup",
      await run("datamitsu setup", "pnpm", ["exec", "datamitsu", "setup"], work, env),
    );
    await run("git add", "git", ["add", "-A"], work, env);
    await run("git commit", "git", ["commit", "-qm", "chore: datamitsu setup"], work, env);
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
        throw new Error(`expected setup to scaffold ${name}, but it is missing`);
      }
    }
    console.log(`  ✓ scaffold present (${expected.join(", ")})`);

    console.log("\n✓ fresh-init smoke test passed");
  } finally {
    if (KEEP) {
      console.log(`\n(kept fixture at ${work})`);
    } else {
      await rm(work, { force: true, recursive: true });
    }
  }
}

async function run(
  label: string,
  file: string,
  cmdArgs: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<StepResult> {
  console.log(`\n▶ ${label}: ${file} ${cmdArgs.join(" ")}`);
  const proc = execa(file, cmdArgs, {
    cwd,
    env,
    reject: false,
    stderr: VERBOSE ? "inherit" : "pipe",
    stdout: VERBOSE ? "inherit" : "pipe",
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
