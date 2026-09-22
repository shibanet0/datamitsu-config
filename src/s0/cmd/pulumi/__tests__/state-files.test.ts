import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PULUMI_STATE_PATTERNS } from "../constants.js";
import { findStateFiles, writeFileAtomic } from "../state-files.js";

describe("stateFiles", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "pulumi-sops-files-")));
    vi.spyOn(process, "cwd").mockReturnValue(root);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(root, { force: true, recursive: true });
  });

  describe("findStateFiles", () => {
    it("should find a workspace stack once despite pnpm node_modules aliases", async () => {
      const stack = path.join(root, "packages", "stack");
      await fs.mkdir(path.join(stack, ".pulumi", "stacks", "stack"), { recursive: true });
      await fs.writeFile(path.join(stack, ".pulumi", "stacks", "stack", "local.json"), "{}");

      const aliasParent = path.join(root, "packages", "consumer", "node_modules", "@workspace");
      await fs.mkdir(aliasParent, { recursive: true });
      await fs.symlink(stack, path.join(aliasParent, "stack"), "dir");

      const outsideLink = path.join(root, "linked-stack");
      await fs.symlink(stack, outsideLink, "dir");

      const files = await findStateFiles(PULUMI_STATE_PATTERNS);

      expect(files).toEqual([path.join(stack, ".pulumi", "stacks", "stack", "local.json")]);
    });

    it("should apply extra ignore patterns", async () => {
      const stacks = path.join(root, ".pulumi", "stacks", "app");
      await fs.mkdir(stacks, { recursive: true });
      await fs.writeFile(path.join(stacks, "dev.json"), "{}");
      await fs.writeFile(path.join(stacks, "dev.json.enc"), "{}");

      const files = await findStateFiles(["**/.pulumi/stacks/**/*"], ["**/*.enc"]);

      expect(files).toEqual([path.join(stacks, "dev.json")]);
    });
  });

  describe("writeFileAtomic", () => {
    it("should replace the target and leave no temporary files", async () => {
      const target = path.join(root, "local.json");
      await fs.writeFile(target, "old");

      await writeFileAtomic(target, "new");

      expect(await fs.readFile(target, "utf8")).toBe("new");
      expect(await fs.readdir(root)).toEqual(["local.json"]);
      const stat = await fs.stat(target);
      expect(stat.mode & 0o777).toBe(0o600);
    });

    it("should keep the previous content when the rename fails", async () => {
      const target = path.join(root, "occupied");
      await fs.mkdir(path.join(target, "child"), { recursive: true });

      await expect(writeFileAtomic(target, "new")).rejects.toThrow();

      expect(await fs.readdir(target)).toEqual(["child"]);
      const entries = await fs.readdir(root);
      expect(entries.filter((entry) => entry.endsWith(".tmp"))).toEqual([]);
    });
  });
});
