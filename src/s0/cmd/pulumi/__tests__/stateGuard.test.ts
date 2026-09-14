import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  backupPlaintext,
  clearDecryptConflict,
  getStateGuardDir,
  hasDecryptConflict,
  markDecryptConflict,
} from "../stateGuard.js";

describe("stateGuard", () => {
  let cacheHome: string;
  let previousCacheHome: string | undefined;

  beforeEach(async () => {
    cacheHome = await fs.mkdtemp(path.join(os.tmpdir(), "pulumi-sops-guard-"));
    previousCacheHome = process.env.XDG_CACHE_HOME;
    process.env.XDG_CACHE_HOME = cacheHome;
  });

  afterEach(async () => {
    if (previousCacheHome === undefined) {
      delete process.env.XDG_CACHE_HOME;
    } else {
      process.env.XDG_CACHE_HOME = previousCacheHome;
    }
    await fs.rm(cacheHome, { force: true, recursive: true });
  });

  it("should keep its files under the user cache, outside any repository", () => {
    expect(getStateGuardDir()).toBe(path.join(cacheHome, "pulumi-sops"));
  });

  it("should write private, uniquely named backups", async () => {
    const first = await backupPlaintext("/repo/.pulumi/stacks/dev.json", Buffer.from("one"));
    const second = await backupPlaintext("/repo/.pulumi/stacks/dev.json", Buffer.from("two"));

    expect(first).not.toBe(second);
    expect(await fs.readFile(first, "utf8")).toBe("one");
    expect(await fs.readFile(second, "utf8")).toBe("two");
    const fileStat = await fs.stat(first);
    expect(fileStat.mode & 0o777).toBe(0o600);
    const dirStat = await fs.stat(path.dirname(first));
    expect(dirStat.mode & 0o777).toBe(0o700);
  });

  it("should track conflicts per plaintext file", async () => {
    const dev = "/repo/.pulumi/stacks/dev.json";
    const prod = "/repo/.pulumi/stacks/prod.json";

    await markDecryptConflict(dev);

    expect(await hasDecryptConflict(dev)).toBe(true);
    expect(await hasDecryptConflict(prod)).toBe(false);

    await clearDecryptConflict(dev);

    expect(await hasDecryptConflict(dev)).toBe(false);
  });

  it("should distinguish stacks that share a file name", async () => {
    await markDecryptConflict("/repo/a/.pulumi/stacks/local.json");

    expect(await hasDecryptConflict("/repo/b/.pulumi/stacks/local.json")).toBe(false);
  });
});
