import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { apps as githubApps } from "../../../datamitsu-config/registries/githubApps.json";
import { installedBunApp } from "../../test-support/managed-bun";
import { resolveUpstream, upstreamName } from "../resolve.js";
import { fixtureEnvironment, testUpstream } from "./env.js";

const app = installedBunApp("lefthook");
const proxyBundle = app.artifact;
const datamitsu = resolve("node_modules/.bin/datamitsu");
const fixtureRoot = mkdtempSync(join(tmpdir(), "datamitsu-real-lefthook-"));

afterAll(() => {
  rmSync(fixtureRoot, { force: true, recursive: true });
});

/**
 * Locate a real upstream Lefthook binary without hard-coding a store path.
 *
 * `DATAMITSU_TEST_LEFTHOOK_UPSTREAM` still wins when set, but the default path asks datamitsu where
 * its store is and then resolves the binary with the proxy's own resolver. That keeps this test
 * runnable from a plain `pnpm test` — including on CI, where `prepare` has already built the bundle
 * and installed the required app — instead of silently skipping until someone remembers the
 * variable.
 */
function discoverUpstream(): string | undefined {
  const override = testUpstream();
  if (override) {
    return existsSync(override) ? override : undefined;
  }

  const storePath = spawnSync(datamitsu, ["store", "path"], {
    encoding: "utf8",
    env: fixtureEnvironment(),
  });
  if (storePath.status !== 0) {
    return undefined;
  }
  try {
    return resolveUpstream({
      active: false,
      noColor: true,
      path: "",
      pathExtensions: "",
      upstreamDirectory: join(storePath.stdout.trim(), ".bin", upstreamName),
      upstreamVersion: githubApps.lefthook.tag,
    });
  } catch {
    return undefined;
  }
}

function execute(
  command: string,
  args: readonly string[],
  cwd: string,
  environment: NodeJS.ProcessEnv = {},
) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: fixtureEnvironment(environment),
  });
}

function git(root: string, args: readonly string[]): string {
  const result = execute("git", args, root);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

const realUpstream = discoverUpstream();
beforeAll(() => {
  if (!realUpstream || !existsSync(proxyBundle)) {
    throw new Error("Build the Lefthook proxy and install its upstream binary with pnpm build");
  }
});

describe("real Lefthook integration", () => {
  it("runs install and an installed pre-commit hook back through the public proxy", () => {
    const repository = join(fixtureRoot, "repo");
    const remote = join(fixtureRoot, "remote.git");
    const bin = join(fixtureRoot, "bin");
    const capturePath = join(fixtureRoot, "capture.json");
    const pushCapturePath = join(fixtureRoot, "push-capture.json");
    mkdirSync(repository);
    mkdirSync(bin);

    const publicProxy = join(bin, "lefthook");
    const privateUpstream = join(bin, "dm-internal-lefthook-upstream");
    copyFileSync(realUpstream!, privateUpstream);
    copyFileSync(proxyBundle, publicProxy);
    chmodSync(publicProxy, 0o755);
    chmodSync(privateUpstream, 0o755);

    const verifier = `
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const result = {
  active: process.env.DATAMITSU_LEFTHOOK_PROXY_ACTIVE,
  a: readFileSync("a.ts", "utf8"),
  b: readFileSync("b.ts", "utf8"),
  partial: readFileSync("partial.ts", "utf8"),
  untrackedExists: existsSync("new-file.ts"),
};
writeFileSync(process.env.DM_REAL_CAPTURE, JSON.stringify(result));
if (
  result.active !== "1" ||
  !["A staged\\n", "A second staged\\n"].includes(result.a) ||
  result.b !== "B\\n" ||
  (!result.partial.includes("line 10 staged") &&
    !result.partial.includes("line 10 formatted")) ||
  result.partial.includes("line 25 unstaged") ||
  result.untrackedExists
) {
  process.exitCode = 19;
}
`;
    const formatter = `
import { readFileSync, writeFileSync } from "node:fs";
const path = "partial.ts";
writeFileSync(path, readFileSync(path, "utf8").replace("line 10 staged", "line 10 formatted"));
`;
    const pushVerifier = `
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const result = {
  active: process.env.DATAMITSU_LEFTHOOK_PROXY_ACTIVE,
  a: readFileSync("a.ts", "utf8"),
  b: readFileSync("b.ts", "utf8"),
  partial: readFileSync("partial.ts", "utf8"),
  untrackedExists: existsSync("new-file.ts"),
};
writeFileSync(process.env.DM_PUSH_CAPTURE, JSON.stringify(result));
if (
  result.active !== "1" ||
  result.a !== "A staged\\n" ||
  result.b !== "B\\n" ||
  !result.partial.includes("line 10 formatted") ||
  result.partial.includes("line 25 unstaged") ||
  result.untrackedExists
) {
  process.exitCode = 29;
}
`;
    const config = `pre-commit:\n  commands:\n    scan-project:\n      priority: 10\n      run: ${process.execPath} verify.mjs\n    format-partial:\n      priority: 20\n      run: ${process.execPath} format.mjs\n      stage_fixed: true\npre-push:\n  commands:\n    scan-project:\n      run: ${process.execPath} verify-push.mjs\n`;
    const partial = Array.from({ length: 30 }, (_, index) => `line ${index + 1}`).join("\n") + "\n";

    writeFileSync(join(repository, "a.ts"), "A\n");
    writeFileSync(join(repository, "b.ts"), "B\n");
    writeFileSync(join(repository, "partial.ts"), partial);
    writeFileSync(join(repository, "verify.mjs"), verifier);
    writeFileSync(join(repository, "verify-push.mjs"), pushVerifier);
    writeFileSync(join(repository, "format.mjs"), formatter);
    writeFileSync(join(repository, "lefthook.yml"), config);
    git(repository, ["init", "--quiet", "--initial-branch=main"]);
    git(repository, ["config", "user.email", "spike@example.test"]);
    git(repository, ["config", "user.name", "Spike"]);
    git(repository, ["add", "."]);
    git(repository, ["commit", "--quiet", "-m", "initial"]);

    const proxyEnvironment = {
      ...app.environment,
      DATAMITSU_LEFTHOOK_UPSTREAM: privateUpstream,
      DM_PUSH_CAPTURE: pushCapturePath,
      DM_REAL_CAPTURE: capturePath,
      PATH: `${bin}:${app.environment.PATH ?? ""}`,
    };
    const install = execute(publicProxy, ["install"], repository, proxyEnvironment);
    expect(install.status, install.stderr).toBe(0);

    const hookPath = join(repository, ".git/hooks/pre-commit");
    const hook = readFileSync(hookPath, "utf8");
    expect(hook).toContain(`PATH='${dirname(app.command)}':"$PATH"`);
    expect(hook).toContain("BUN_OPTIONS='--config=/dev/null --no-env-file --no-install'");
    const reinstall = execute(publicProxy, ["install"], repository, proxyEnvironment);
    expect(reinstall.status, reinstall.stderr).toBe(0);
    expect(readFileSync(hookPath, "utf8").match(/# datamitsu-lefthook-proxy/g)).toHaveLength(1);
    expect(hook).toContain(`LEFTHOOK_BIN='${publicProxy}'`);
    expect(hook).toContain(`DATAMITSU_LEFTHOOK_UPSTREAM='${realpathSync(privateUpstream)}'`);

    writeFileSync(join(repository, "a.ts"), "A staged\n");
    writeFileSync(join(repository, "partial.ts"), partial.replace("line 10", "line 10 staged"));
    git(repository, ["add", "a.ts", "partial.ts"]);
    writeFileSync(
      join(repository, "partial.ts"),
      readFileSync(join(repository, "partial.ts"), "utf8").replace("line 25", "line 25 unstaged"),
    );
    writeFileSync(join(repository, "b.ts"), "B unstaged\n");
    writeFileSync(join(repository, "new-file.ts"), "untracked\n");

    const commit = execute(
      "git",
      ["commit", "--quiet", "-m", "through proxy"],
      repository,
      proxyEnvironment,
    );
    expect(commit.status, `${commit.stdout}\n${commit.stderr}`).toBe(0);
    expect(JSON.parse(readFileSync(capturePath, "utf8"))).toEqual({
      a: "A staged\n",
      active: "1",
      b: "B\n",
      partial: expect.stringContaining("line 10 staged"),
      untrackedExists: false,
    });
    expect(git(repository, ["show", "HEAD:partial.ts"])).toContain("line 10 formatted");
    expect(readFileSync(join(repository, "partial.ts"), "utf8")).toContain("line 10 staged");
    expect(readFileSync(join(repository, "partial.ts"), "utf8")).not.toContain("line 10 formatted");
    expect(readFileSync(join(repository, "partial.ts"), "utf8")).toContain("line 25 unstaged");
    expect(readFileSync(join(repository, "b.ts"), "utf8")).toBe("B unstaged\n");
    expect(readFileSync(join(repository, "new-file.ts"), "utf8")).toBe("untracked\n");

    git(fixtureRoot, ["init", "--bare", "--quiet", remote]);
    git(repository, ["remote", "add", "origin", remote]);
    writeFileSync(join(repository, "a.ts"), "A staged after commit\n");
    git(repository, ["add", "a.ts"]);
    const push = execute(
      "git",
      ["push", "--quiet", "--set-upstream", "origin", "HEAD"],
      repository,
      proxyEnvironment,
    );
    expect(push.status, `${push.stdout}\n${push.stderr}`).toBe(0);
    expect(JSON.parse(readFileSync(pushCapturePath, "utf8"))).toEqual({
      a: "A staged\n",
      active: "1",
      b: "B\n",
      partial: expect.stringContaining("line 10 formatted"),
      untrackedExists: false,
    });
    expect(git(repository, ["show", ":a.ts"])).toBe("A staged after commit\n");
    expect(readFileSync(join(repository, "b.ts"), "utf8")).toBe("B unstaged\n");
    expect(readFileSync(join(repository, "new-file.ts"), "utf8")).toBe("untracked\n");

    writeFileSync(join(repository, "a.ts"), "A second staged\n");
    writeFileSync(join(repository, "lefthook.yml"), `${config}\n# force checksum refresh\n`);
    git(repository, ["add", "a.ts", "lefthook.yml"]);
    rmSync(capturePath);
    const isolatedEnvironment: NodeJS.ProcessEnv = {
      DM_REAL_CAPTURE: capturePath,
      PATH: [dirname(process.execPath), "/usr/bin", "/bin"].join(delimiter),
    };
    delete isolatedEnvironment.DATAMITSU_LEFTHOOK_PROXY_ACTIVE;
    const isolatedCommit = execute(
      "git",
      ["commit", "--quiet", "-m", "absolute public proxy"],
      repository,
      isolatedEnvironment,
    );
    expect(isolatedCommit.status, `${isolatedCommit.stdout}\n${isolatedCommit.stderr}`).toBe(0);
    expect(JSON.parse(readFileSync(capturePath, "utf8"))).toMatchObject({
      a: "A second staged\n",
      active: "1",
    });
    expect(readFileSync(hookPath, "utf8")).toContain("# datamitsu-lefthook-proxy");
    expect(readFileSync(join(repository, "b.ts"), "utf8")).toBe("B unstaged\n");
    expect(readFileSync(join(repository, "new-file.ts"), "utf8")).toBe("untracked\n");
  });
});
