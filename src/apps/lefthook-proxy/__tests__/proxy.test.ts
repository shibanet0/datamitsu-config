import { spawn, spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join, resolve as resolvePath } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const packageRoot = resolvePath(import.meta.dirname, "..");
const proxySource = join(packageRoot, "index.ts");
const fakeSource = join(import.meta.dirname, "fixtures/fake-upstream.mjs");
const tsx = resolvePath("node_modules/.bin/tsx");
const tsxEsm = import.meta.resolve("tsx/esm");
const temporaryDirectories: string[] = [];
const unixIt = process.platform === "win32" ? it.skip : it;

/**
 * Fixture repositories must not inherit the developer's Git configuration. Commit signing,
 * `core.hooksPath` or `init.templateDir` in a global config would otherwise decide whether this
 * suite passes, making it green on CI and red on a real machine (or the other way round). Applied
 * last on every spawn so it also reaches the Git processes the proxy itself starts.
 */
const isolatedGitConfig: NodeJS.ProcessEnv = {
  GIT_CONFIG_GLOBAL: devNull,
  GIT_CONFIG_SYSTEM: devNull,
};

interface RepositoryFixture {
  capturePath: string;
  fakeUpstream: string;
  root: string;
}

function createRepository(files: Record<string, string>): RepositoryFixture {
  const parent = temporaryDirectory("datamitsu-lefthook-proxy-");
  const root = join(parent, "repo");
  const bin = join(parent, "bin");
  mkdirSync(root);
  mkdirSync(bin);

  git(root, ["init", "--quiet", "--initial-branch=main"]);
  git(root, ["config", "user.email", "spike@example.test"]);
  git(root, ["config", "user.name", "Spike"]);
  for (const [path, contents] of Object.entries(files)) {
    write(root, path, contents);
  }
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "initial"]);

  const fakeUpstream = join(bin, "dm-internal-lefthook-upstream");
  cpSync(fakeSource, fakeUpstream);
  chmodSync(fakeUpstream, 0o755);

  return {
    capturePath: join(parent, "capture.json"),
    fakeUpstream,
    root,
  };
}

function execute(
  command: string,
  args: readonly string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; input?: string },
): SpawnSyncReturns<string> {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: { ...(options.env ?? process.env), ...isolatedGitConfig },
    input: options.input,
  });
}

function git(root: string, args: readonly string[]): string {
  const result = execute("git", args, { cwd: root });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

function proxy(
  fixture: RepositoryFixture,
  args: readonly string[],
  environment: NodeJS.ProcessEnv = {},
  input?: string,
): SpawnSyncReturns<string> {
  return execute(tsx, [proxySource, ...args], {
    cwd: fixture.root,
    env: {
      ...process.env,
      DATAMITSU_LEFTHOOK_UPSTREAM: fixture.fakeUpstream,
      ...environment,
    },
    ...(input === undefined ? {} : { input }),
  });
}

function stashList(root: string): string {
  return git(root, ["stash", "list", "--format=%H%x09%gs"]);
}

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function write(root: string, path: string, contents: string): void {
  const absolutePath = join(root, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { force: true, recursive: true });
  }
  temporaryDirectories.length = 0;
});

describe("lefthook proxy", () => {
  it("passes commands without an isolation policy through transparently", () => {
    const fixture = createRepository({ "a.ts": "A\n" });
    const result = proxy(
      fixture,
      ["run", "commit-msg", "--force"],
      { DM_FAKE_MODE: "passthrough", DM_PASSTHROUGH_VALUE: "kept" },
      "stdin payload",
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe("fake upstream stderr\n");
    expect(JSON.parse(result.stdout)).toEqual({
      active: null,
      args: ["run", "commit-msg", "--force"],
      cwd: realpathSync(fixture.root),
      environment: "kept",
      input: "stdin payload",
    });
  });

  it("does not start a second isolation transaction during nested hook execution", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B visible to the nested command\n");

    const result = proxy(fixture, ["run", "pre-commit"], {
      DATAMITSU_LEFTHOOK_PROXY_ACTIVE: "1",
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: JSON.stringify(["a.ts", "b.ts"]),
    });

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(readFileSync(fixture.capturePath, "utf8"))).toMatchObject({
      active: "1",
      files: { "a.ts": "A staged\n", "b.ts": "B visible to the nested command\n" },
    });
    expect(stashList(fixture.root)).toBe("");
  });

  it.each([["--help"], ["help", "run"], ["run", "pre-push", "--help"]])(
    "adds a machine-readable proxy notice to help without isolating for %j",
    (...args) => {
      const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
      write(fixture.root, "a.ts", "A staged\n");
      git(fixture.root, ["add", "a.ts"]);
      write(fixture.root, "b.ts", "B unstaged\n");

      const result = proxy(fixture, args, { DM_FAKE_MODE: "passthrough" });

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("Datamitsu Lefthook proxy");
      expect(result.stderr).toContain("not the upstream Lefthook executable");
      expect(result.stderr).toContain("does not rewrite branch history");
      expect(JSON.parse(result.stdout).active).toBeNull();
      expect(git(fixture.root, ["show", ":a.ts"])).toBe("A staged\n");
      expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B unstaged\n");
      expect(stashList(fixture.root)).toBe("");
    },
  );

  it("shows a pre-push child clean HEAD and restores index, worktree, and untracked files", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B unstaged\n");
    write(fixture.root, "new file.ts", "untracked\n");

    const paths = ["a.ts", "b.ts", "new file.ts"];
    const result = proxy(fixture, ["run", "pre-push"], {
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: JSON.stringify(paths),
    });

    expect(result.status, result.stderr).toBe(0);
    const capture = JSON.parse(readFileSync(fixture.capturePath, "utf8"));
    expect(capture.active).toBe("1");
    expect(capture.files).toEqual({ "a.ts": "A\n", "b.ts": "B\n", "new file.ts": null });
    expect(capture.index).toEqual({ "a.ts": "A\n", "b.ts": "B\n", "new file.ts": null });
    expect(git(fixture.root, ["show", ":a.ts"])).toBe("A staged\n");
    expect(readFileSync(join(fixture.root, "a.ts"), "utf8")).toBe("A staged\n");
    expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B unstaged\n");
    expect(readFileSync(join(fixture.root, "new file.ts"), "utf8")).toBe("untracked\n");
    expect(stashList(fixture.root)).toBe("");
  });

  it("restores staged deletions after pre-push", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    git(fixture.root, ["rm", "--quiet", "a.ts"]);
    write(fixture.root, "b.ts", "B unstaged\n");

    const result = proxy(fixture, ["run", "pre-push"], {
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: JSON.stringify(["a.ts", "b.ts"]),
    });

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(readFileSync(fixture.capturePath, "utf8")).files).toEqual({
      "a.ts": "A\n",
      "b.ts": "B\n",
    });
    expect(existsSync(join(fixture.root, "a.ts"))).toBe(false);
    expect(execute("git", ["show", ":a.ts"], { cwd: fixture.root }).status).not.toBe(0);
    expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B unstaged\n");
    expect(stashList(fixture.root)).toBe("");
  });

  it("shows the child the index snapshot and restores tracked and untracked changes", () => {
    const lines = Array.from({ length: 24 }, (_, index) => `line ${index + 1}`).join("\n") + "\n";
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n", "partial.ts": lines });

    write(fixture.root, "a.ts", "A staged\n");
    write(fixture.root, "partial.ts", lines.replace("line 10", "line 10 staged"));
    git(fixture.root, ["add", "a.ts", "partial.ts"]);

    const partiallyStaged = readFileSync(join(fixture.root, "partial.ts"), "utf8").replace(
      "line 20",
      "line 20 unstaged",
    );
    write(fixture.root, "partial.ts", partiallyStaged);
    write(fixture.root, "b.ts", "B unstaged\n");
    write(fixture.root, "new file.ts", "untracked\n");
    write(fixture.root, "nested/ещё файл.ts", "unicode\n");
    write(fixture.root, ":(glob)*", "literal pathspec\n");

    const paths = ["a.ts", "b.ts", "partial.ts", "new file.ts", "nested/ещё файл.ts", ":(glob)*"];
    const result = proxy(fixture, ["run", "pre-commit"], {
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: JSON.stringify(paths),
    });

    expect(result.status, result.stderr).toBe(0);
    const capture = JSON.parse(readFileSync(fixture.capturePath, "utf8"));
    expect(capture.active).toBe("1");
    expect(capture.files["a.ts"]).toBe("A staged\n");
    expect(capture.files["b.ts"]).toBe("B\n");
    expect(capture.files["partial.ts"]).toContain("line 10 staged");
    expect(capture.files["partial.ts"]).toContain("line 20\n");
    expect(capture.files["new file.ts"]).toBeNull();
    expect(capture.files["nested/ещё файл.ts"]).toBeNull();
    expect(capture.files[":(glob)*"]).toBeNull();

    expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B unstaged\n");
    expect(readFileSync(join(fixture.root, "partial.ts"), "utf8")).toBe(partiallyStaged);
    expect(git(fixture.root, ["show", ":partial.ts"])).toContain("line 10 staged");
    expect(existsSync(join(fixture.root, "new file.ts"))).toBe(true);
    expect(existsSync(join(fixture.root, "nested/ещё файл.ts"))).toBe(true);
    expect(readFileSync(join(fixture.root, ":(glob)*"), "utf8")).toBe("literal pathspec\n");
    expect(stashList(fixture.root)).toBe("");
  });

  it("restores an unstaged deletion after pre-commit", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    rmSync(join(fixture.root, "b.ts"));

    const result = proxy(fixture, ["run", "pre-commit"], {
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: JSON.stringify(["a.ts", "b.ts"]),
    });

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(readFileSync(fixture.capturePath, "utf8")).files).toEqual({
      "a.ts": "A staged\n",
      "b.ts": "B\n",
    });
    expect(existsSync(join(fixture.root, "b.ts"))).toBe(false);
    expect(git(fixture.root, ["show", ":b.ts"])).toBe("B\n");
    expect(stashList(fixture.root)).toBe("");
  });

  it("runs the initial commit without isolation because git stash requires HEAD", () => {
    const parent = temporaryDirectory("datamitsu-lefthook-proxy-unborn-");
    const root = join(parent, "repo");
    const bin = join(parent, "bin");
    mkdirSync(root);
    mkdirSync(bin);
    git(root, ["init", "--quiet", "--initial-branch=main"]);
    git(root, ["config", "user.email", "spike@example.test"]);
    git(root, ["config", "user.name", "Spike"]);
    write(root, "a.ts", "A staged\n");
    git(root, ["add", "a.ts"]);
    write(root, "untracked.ts", "untracked\n");
    const fakeUpstream = join(bin, "dm-internal-lefthook-upstream");
    cpSync(fakeSource, fakeUpstream);
    chmodSync(fakeUpstream, 0o755);
    const fixture = { capturePath: join(parent, "capture.json"), fakeUpstream, root };

    const result = proxy(fixture, ["run", "pre-commit"], {
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: JSON.stringify(["a.ts", "untracked.ts"]),
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain("initial commit has no HEAD snapshot");
    expect(JSON.parse(readFileSync(fixture.capturePath, "utf8")).files).toEqual({
      "a.ts": "A staged\n",
      "untracked.ts": "untracked\n",
    });
    expect(stashList(root)).toBe("");
  });

  it("does not stash when Git exposes an alternate commit index", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B visible with alternate index\n");

    const result = proxy(fixture, ["run", "pre-commit"], {
      GIT_INDEX_FILE: join(fixture.root, ".git", "next-index-test"),
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: JSON.stringify(["a.ts", "b.ts"]),
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain("Git is using an alternate index");
    expect(JSON.parse(readFileSync(fixture.capturePath, "utf8")).files).toEqual({
      "a.ts": "A staged\n",
      "b.ts": "B visible with alternate index\n",
    });
    expect(stashList(fixture.root)).toBe("");
  });

  it.each([[".git/index.lock"], [".git/next-index-4242.lock"]])(
    "reports the lost isolation when Git holds the staging lock %s",
    (indexFile) => {
      const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
      write(fixture.root, "a.ts", "A staged\n");
      git(fixture.root, ["add", "a.ts"]);
      write(fixture.root, "b.ts", "B visible under the staging lock\n");

      const result = proxy(fixture, ["run", "pre-commit"], {
        GIT_INDEX_FILE: join(fixture.root, indexFile),
        DM_CAPTURE_PATH: fixture.capturePath,
        DM_FAKE_MODE: "inspect",
        DM_INSPECT_PATHS: JSON.stringify(["a.ts", "b.ts"]),
      });

      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toContain("temporary staging index");
      expect(result.stderr).toContain("WITHOUT working-tree isolation");
      expect(result.stderr).toContain("git commit -a");
      expect(JSON.parse(readFileSync(fixture.capturePath, "utf8")).files).toEqual({
        "a.ts": "A staged\n",
        "b.ts": "B visible under the staging lock\n",
      });
      expect(stashList(fixture.root)).toBe("");
    },
  );

  it("still isolates when Git exposes the normal repository index", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B hidden from the hook\n");

    const result = proxy(fixture, ["run", "pre-commit"], {
      GIT_INDEX_FILE: ".git/index",
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: JSON.stringify(["a.ts", "b.ts"]),
    });

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(readFileSync(fixture.capturePath, "utf8")).files).toEqual({
      "a.ts": "A staged\n",
      "b.ts": "B\n",
    });
    expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B hidden from the hook\n");
    expect(stashList(fixture.root)).toBe("");
  });

  it("does not stash while a merge operation is in progress", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "a.ts", "A staged merge result\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B visible during merge\n");
    const gitDirectory = git(fixture.root, ["rev-parse", "--absolute-git-dir"]).trim();
    writeFileSync(
      join(gitDirectory, "MERGE_HEAD"),
      `${git(fixture.root, ["rev-parse", "HEAD"]).trim()}\n`,
    );
    writeFileSync(join(gitDirectory, "MERGE_MSG"), "merge fixture\n");

    const result = proxy(fixture, ["run", "pre-commit"], {
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: JSON.stringify(["a.ts", "b.ts"]),
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain("merge is in progress");
    expect(JSON.parse(readFileSync(fixture.capturePath, "utf8")).files).toEqual({
      "a.ts": "A staged merge result\n",
      "b.ts": "B visible during merge\n",
    });
    expect(existsSync(join(gitDirectory, "MERGE_HEAD"))).toBe(true);
    expect(readFileSync(join(gitDirectory, "MERGE_MSG"), "utf8")).toBe("merge fixture\n");
    expect(stashList(fixture.root)).toBe("");
  });

  unixIt("restores a transaction created by a failing stash push", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B unstaged\n");
    write(fixture.root, "untracked.ts", "untracked\n");

    const wrapperDirectory = join(dirname(fixture.fakeUpstream), "git-wrapper");
    mkdirSync(wrapperDirectory);
    const wrapper = join(wrapperDirectory, "git");
    const systemGit = execute("sh", ["-c", "command -v git"], { cwd: fixture.root }).stdout.trim();
    writeFileSync(
      wrapper,
      `#!/bin/sh
case " $* " in
  *" stash push "*) "$DM_REAL_GIT" "$@"; exit 42 ;;
esac
exec "$DM_REAL_GIT" "$@"
`,
    );
    chmodSync(wrapper, 0o755);

    const result = proxy(fixture, ["run", "pre-commit"], {
      DM_REAL_GIT: systemGit,
      PATH: `${wrapperDirectory}:${process.env.PATH ?? ""}`,
    });

    expect(result.status).toBe(70);
    expect(result.stderr).toContain("cannot isolate the working tree");
    expect(result.stderr).toContain("working tree restored from the transaction backup");
    expect(git(fixture.root, ["show", ":a.ts"])).toBe("A staged\n");
    expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B unstaged\n");
    expect(readFileSync(join(fixture.root, "untracked.ts"), "utf8")).toBe("untracked\n");
    expect(stashList(fixture.root)).toBe("");
  });

  it("restores after an upstream failure and preserves its exit code", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B unstaged\n");

    const result = proxy(fixture, ["run", "pre-commit"], {
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_EXIT_CODE: "23",
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: "[]",
    });

    expect(result.status).toBe(23);
    expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B unstaged\n");
    expect(stashList(fixture.root)).toBe("");
  });

  it("keeps new staged formatter output and restores the exact pre-hook working file", () => {
    const lines = Array.from({ length: 30 }, (_, index) => `line ${index + 1}`).join("\n") + "\n";
    const fixture = createRepository({ "partial.ts": lines });
    const staged = lines.replace("line 10", "line 10 staged");
    const worktree = staged.replace("line 25", "line 25 unstaged");
    write(fixture.root, "partial.ts", staged);
    git(fixture.root, ["add", "partial.ts"]);
    write(fixture.root, "partial.ts", worktree);

    const result = proxy(fixture, ["run", "pre-commit"], {
      DM_FAKE_MODE: "format",
      DM_FORMAT_AFTER: "line 10 formatted",
      DM_FORMAT_BEFORE: "line 10 staged",
      DM_FORMAT_PATH: "partial.ts",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(git(fixture.root, ["show", ":partial.ts"])).toContain("line 10 formatted");
    expect(readFileSync(join(fixture.root, "partial.ts"), "utf8")).toBe(worktree);
    expect(stashList(fixture.root)).toBe("");
  });

  it.each([undefined, "23"])(
    "restores the old working file even when formatter output overlaps it (child exit %s)",
    (childExitCode) => {
      const fixture = createRepository({ "partial.ts": "value = base\n" });
      write(fixture.root, "partial.ts", "value = staged\n");
      git(fixture.root, ["add", "partial.ts"]);
      write(fixture.root, "partial.ts", "value = unstaged\n");

      const result = proxy(fixture, ["run", "pre-commit"], {
        ...(childExitCode ? { DM_EXIT_CODE: childExitCode } : {}),
        DM_FAKE_MODE: "format",
        DM_FORMAT_AFTER: "value = formatted",
        DM_FORMAT_BEFORE: "value = staged",
        DM_FORMAT_PATH: "partial.ts",
      });

      expect(result.status, result.stderr).toBe(childExitCode ? 23 : 0);
      expect(git(fixture.root, ["show", ":partial.ts"])).toBe("value = formatted\n");
      expect(readFileSync(join(fixture.root, "partial.ts"), "utf8")).toBe("value = unstaged\n");
      expect(stashList(fixture.root)).toBe("");
    },
  );

  unixIt.each([undefined, "23"])(
    "preserves the backup when the old working tree cannot be restored (child exit %s)",
    (childExitCode) => {
      const fixture = createRepository({ "a.ts": "A\n" });
      write(fixture.root, "a.ts", "A staged\n");
      git(fixture.root, ["add", "a.ts"]);
      write(fixture.root, "collision", "original untracked file\n");

      const result = proxy(fixture, ["run", "pre-commit"], {
        ...(childExitCode ? { DM_EXIT_CODE: childExitCode } : {}),
        DM_FAKE_MODE: "deny-working-tree-restore",
      });
      chmodSync(fixture.root, 0o755);

      expect(result.status).toBe(70);
      expect(result.stderr).toContain("working tree restore failed");
      expect(result.stderr).toContain("recovery backup preserved as");
      if (childExitCode) {
        expect(result.stderr).toContain("upstream Lefthook also failed: exited with code 23");
      }
      expect(stashList(fixture.root)).toContain("datamitsu-lefthook-proxy-");
    },
  );

  it("does not modify existing user stash entries", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "b.ts", "user stash one\n");
    git(fixture.root, ["stash", "push", "--quiet", "-m", "user-one"]);
    write(fixture.root, "b.ts", "user stash two\n");
    git(fixture.root, ["stash", "push", "--quiet", "-m", "user-two"]);
    const before = stashList(fixture.root);

    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B unstaged\n");
    const result = proxy(fixture, ["run", "pre-commit"], {
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: "[]",
    });

    expect(result.status).toBe(0);
    expect(stashList(fixture.root)).toBe(before);
    expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B unstaged\n");
  });

  it("ignores a transaction backup owned by another worktree", () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "b.ts", "hidden by the other worktree\n");
    // Linked worktrees share refs/stash. A backup stamped with a different
    // worktree id must not abort this worktree's commit.
    git(fixture.root, [
      "stash",
      "push",
      "--quiet",
      "-m",
      "datamitsu-lefthook-proxy-0123456789ab-00000000-0000-4000-8000-000000000000",
    ]);
    const foreignStash = stashList(fixture.root);

    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B unstaged\n");

    const result = proxy(fixture, ["run", "pre-commit"], {
      DM_CAPTURE_PATH: fixture.capturePath,
      DM_FAKE_MODE: "inspect",
      DM_INSPECT_PATHS: JSON.stringify(["a.ts", "b.ts"]),
    });

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(readFileSync(fixture.capturePath, "utf8")).files).toEqual({
      "a.ts": "A staged\n",
      "b.ts": "B\n",
    });
    expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B unstaged\n");
    expect(stashList(fixture.root)).toBe(foreignStash);
  });

  unixIt.each([
    ["pre-commit", "SIGHUP", 129],
    ["pre-commit", "SIGINT", 130],
    ["pre-commit", "SIGTERM", 143],
    ["pre-push", "SIGHUP", 129],
    ["pre-push", "SIGINT", 130],
    ["pre-push", "SIGTERM", 143],
  ] as const)("during %s forwards %s, restores, and returns %s", async (hook, signal, exitCode) => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B unstaged\n");
    const readyPath = join(dirname(fixture.capturePath), "ready");

    // Run the proxy under `node --import tsx/esm` rather than the `tsx` shim:
    // the shim is a separate process that only relays some signals, so killing
    // it would test tsx's relay instead of the proxy's.
    const child = spawn(process.execPath, ["--import", tsxEsm, proxySource, "run", hook], {
      cwd: fixture.root,
      env: {
        ...process.env,
        DATAMITSU_LEFTHOOK_UPSTREAM: fixture.fakeUpstream,
        DM_FAKE_MODE: "wait",
        DM_READY_PATH: readyPath,
        ...isolatedGitConfig,
      },
      stdio: "ignore",
    });

    await expect.poll(() => existsSync(readyPath), { interval: 20, timeout: 10_000 }).toBe(true);
    child.kill(signal);
    const result = await new Promise<{ code: null | number; signal: NodeJS.Signals | null }>(
      (resolve) => {
        child.once("close", (code, receivedSignal) => resolve({ code, signal: receivedSignal }));
      },
    );

    expect(result).toEqual({ code: exitCode, signal: null });
    expect(git(fixture.root, ["show", ":a.ts"])).toBe("A staged\n");
    expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B unstaged\n");
    expect(stashList(fixture.root)).toBe("");
  });

  unixIt("leaves a recoverable transaction stash after SIGKILL", async () => {
    const fixture = createRepository({ "a.ts": "A\n", "b.ts": "B\n" });
    write(fixture.root, "a.ts", "A staged\n");
    git(fixture.root, ["add", "a.ts"]);
    write(fixture.root, "b.ts", "B unstaged\n");
    const readyPath = join(dirname(fixture.capturePath), "sigkill-ready");

    const proxyProcess = spawn(
      process.execPath,
      ["--import", tsxEsm, proxySource, "run", "pre-commit"],
      {
        cwd: fixture.root,
        env: {
          ...process.env,
          DATAMITSU_LEFTHOOK_UPSTREAM: fixture.fakeUpstream,
          DM_FAKE_MODE: "wait",
          DM_READY_PATH: readyPath,
          ...isolatedGitConfig,
        },
        stdio: "ignore",
      },
    );
    await expect.poll(() => existsSync(readyPath), { interval: 20, timeout: 10_000 }).toBe(true);

    proxyProcess.kill("SIGKILL");
    const result = await new Promise<{ code: null | number; signal: NodeJS.Signals | null }>(
      (resolve) => {
        proxyProcess.once("close", (code, signal) => resolve({ code, signal }));
      },
    );
    process.kill(Number(readFileSync(readyPath, "utf8")), "SIGKILL");

    expect(result).toEqual({ code: null, signal: "SIGKILL" });
    expect(readFileSync(join(fixture.root, "b.ts"), "utf8")).toBe("B\n");
    const orphanedStash = stashList(fixture.root);
    expect(orphanedStash).toContain("datamitsu-lefthook-proxy-");

    const retry = proxy(fixture, ["run", "pre-commit"], { DM_FAKE_MODE: "passthrough" });
    expect(retry.status, retry.stderr).toBe(70);
    expect(retry.stderr).toContain("unfinished transaction backup");
    expect(stashList(fixture.root)).toBe(orphanedStash);
  });
});
