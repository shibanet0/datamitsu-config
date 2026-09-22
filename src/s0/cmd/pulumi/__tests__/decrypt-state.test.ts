import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pulumiDecrypt } from "../decrypt-state.js";

vi.mock("fast-glob");
vi.mock("../../../../lib/index.js");
vi.mock("../../../utils/tty.js");

describe("decryptState", () => {
  let root: string;
  let cacheHome: string;
  let previousCacheHome: string | undefined;
  let mockGlob: any;
  let mockDatamitsu: any;
  let mockGetGPGTTY: any;
  let consoleSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  const stateFile = (name: string) => path.join(root, ".pulumi", "stacks", name);

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pulumi-sops-decrypt-"));
    cacheHome = await fs.mkdtemp(path.join(os.tmpdir(), "pulumi-sops-cache-"));
    previousCacheHome = process.env.XDG_CACHE_HOME;
    process.env.XDG_CACHE_HOME = cacheHome;
    await fs.mkdir(path.join(root, ".pulumi", "stacks"), { recursive: true });

    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    const fastGlob = await import("fast-glob");
    mockGlob = vi.fn().mockResolvedValue([]);
    vi.mocked(fastGlob).default = { glob: mockGlob } as any;

    const libModule = await import("../../../../lib/index.js");
    mockDatamitsu = {
      exec: vi.fn().mockResolvedValue({ exitCode: 0, stderr: "", stdout: '{"version": 3}\n' }),
    };
    vi.mocked(libModule.Datamitsu).mockImplementation(function () {
      return mockDatamitsu;
    } as any);

    const ttyModule = await import("../../../utils/tty.js");
    mockGetGPGTTY = vi.fn().mockResolvedValue("/dev/ttys001");
    vi.mocked(ttyModule.getGPGTTY).mockImplementation(mockGetGPGTTY);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    if (previousCacheHome === undefined) {
      delete process.env.XDG_CACHE_HOME;
    } else {
      process.env.XDG_CACHE_HOME = previousCacheHome;
    }
    await fs.rm(root, { force: true, recursive: true });
    await fs.rm(cacheHome, { force: true, recursive: true });
  });

  describe("pulumiDecrypt", () => {
    it("should create a missing plaintext with the exact decrypted bytes", async () => {
      const encrypted = stateFile("dev.json.enc");
      mockGlob.mockResolvedValue([encrypted]);

      await pulumiDecrypt();

      expect(await fs.readFile(stateFile("dev.json"), "utf8")).toBe('{"version": 3}\n');
      const stat = await fs.stat(stateFile("dev.json"));
      expect(stat.mode & 0o777).toBe(0o600);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Decrypted:"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1/1 succeeded"));
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it("should leave an existing plaintext untouched when only formatting differs", async () => {
      const plaintext = stateFile("dev.json");
      await fs.writeFile(plaintext, '{\n    "version": 3\n}');
      mockGlob.mockResolvedValue([`${plaintext}.enc`]);

      await pulumiDecrypt();

      expect(await fs.readFile(plaintext, "utf8")).toBe('{\n    "version": 3\n}');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Unchanged:"));
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it("should refuse to overwrite a plaintext that differs from the encrypted file", async () => {
      const plaintext = stateFile("dev.json");
      const newerState = '{"resources": [{"urn": "created-by-last-up"}]}';
      await fs.writeFile(plaintext, newerState);
      mockGlob.mockResolvedValue([`${plaintext}.enc`]);
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: '{"resources": []}' });

      await pulumiDecrypt();

      expect(await fs.readFile(plaintext, "utf8")).toBe(newerState);
      expect(await fs.readdir(path.dirname(plaintext))).toEqual(["dev.json"]);
      expect(await fs.readdir(path.join(cacheHome, "pulumi-sops", "conflicts"))).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Decryption error"),
        expect.objectContaining({ message: expect.stringContaining("refusing to overwrite") }),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should treat a reordered resource list as a difference", async () => {
      const plaintext = stateFile("dev.json");
      const topological = '{"resources": [{"urn": "dependency"}, {"urn": "dependent"}]}';
      await fs.writeFile(plaintext, topological);
      mockGlob.mockResolvedValue([`${plaintext}.enc`]);
      mockDatamitsu.exec.mockResolvedValue({
        exitCode: 0,
        stdout: '{"resources": [{"urn": "dependent"}, {"urn": "dependency"}]}',
      });

      await pulumiDecrypt();

      expect(await fs.readFile(plaintext, "utf8")).toBe(topological);
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should replace a differing plaintext with --force and keep a backup", async () => {
      const plaintext = stateFile("dev.json");
      await fs.writeFile(plaintext, '{"resources": ["old"]}');
      mockGlob.mockResolvedValue([`${plaintext}.enc`]);
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: '{"resources": ["new"]}' });

      await pulumiDecrypt({ force: true });

      expect(await fs.readFile(plaintext, "utf8")).toBe('{"resources": ["new"]}');
      expect(await fs.readdir(path.dirname(plaintext))).toEqual(["dev.json"]);
      const backupDir = path.join(cacheHome, "pulumi-sops", "backups");
      const backups = await fs.readdir(backupDir);
      expect(backups).toHaveLength(1);
      expect(await fs.readFile(path.join(backupDir, backups[0]!), "utf8")).toBe(
        '{"resources": ["old"]}',
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Replaced:"));
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it("should clear the conflict marker once the difference is resolved", async () => {
      const plaintext = stateFile("dev.json");
      await fs.writeFile(plaintext, '{"resources": ["old"]}');
      mockGlob.mockResolvedValue([`${plaintext}.enc`]);
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: '{"resources": ["new"]}' });

      await pulumiDecrypt();
      const conflicts = path.join(cacheHome, "pulumi-sops", "conflicts");
      expect(await fs.readdir(conflicts)).toHaveLength(1);

      await pulumiDecrypt({ force: true });
      expect(await fs.readdir(conflicts)).toEqual([]);
    });

    it("should not leak decrypted state through SOPS errors", async () => {
      mockGlob.mockResolvedValue([stateFile("dev.json.enc")]);
      mockDatamitsu.exec.mockRejectedValue(
        Object.assign(new Error('Command failed: maxBuffer exceeded {"secret": "value"}'), {
          exitCode: 1,
          stderr: "maxBuffer exceeded",
          stdout: '{"secret": "value"}',
        }),
      );

      await pulumiDecrypt();

      const reported = consoleErrorSpy.mock.calls[0][1];
      expect(reported.message).toContain("sops --decrypt failed");
      expect(reported.message).toContain("maxBuffer exceeded");
      expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain("secret");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should compare YAML structurally", async () => {
      const plaintext = path.join(root, ".pulumi", "meta.yaml");
      await fs.writeFile(plaintext, "version: 1\n");
      mockGlob.mockResolvedValue([`${plaintext}.enc`]);
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: "version:   1" });

      await pulumiDecrypt();

      expect(await fs.readFile(plaintext, "utf8")).toBe("version: 1\n");
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it("should handle no encrypted files found", async () => {
      await pulumiDecrypt();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("0 encrypted file(s)"));
      expect(mockDatamitsu.exec).not.toHaveBeenCalled();
    });

    it("should decrypt to stdout without --output", async () => {
      const encrypted = stateFile("dev.json.enc");
      mockGlob.mockResolvedValue([encrypted]);

      await pulumiDecrypt();

      expect(mockDatamitsu.exec).toHaveBeenCalledWith(
        "sops",
        ["--decrypt", "--input-type", "json", "--output-type", "json", encrypted],
        expect.objectContaining({
          cwd: process.cwd(),
          env: expect.objectContaining({ GPG_TTY: "/dev/ttys001" }),
          stripFinalNewline: false,
        }),
      );
    });

    it("should search without following symlinks or entering node_modules", async () => {
      await pulumiDecrypt();

      expect(mockGlob).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          followSymbolicLinks: false,
          ignore: expect.arrayContaining(["**/node_modules/**"]),
        }),
      );
    });

    it("should process files in batches of 5", async () => {
      const files = Array.from({ length: 12 }, (_, i) => stateFile(`stack${i}.json.enc`));
      mockGlob.mockResolvedValue(files);

      await pulumiDecrypt();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("12 encrypted file(s)"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("12/12 succeeded"));
      expect(mockDatamitsu.exec).toHaveBeenCalledTimes(12);
    });

    it("should aggregate errors from multiple files", async () => {
      mockGlob.mockResolvedValue([stateFile("dev.json.enc"), stateFile("prod.json.enc")]);
      mockDatamitsu.exec.mockRejectedValue(new Error("Decryption failed"));

      await pulumiDecrypt();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("0/2 succeeded"));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle partial batch failures", async () => {
      mockGlob.mockResolvedValue([
        stateFile("dev.json.enc"),
        stateFile("prod.json.enc"),
        stateFile("staging.json.enc"),
      ]);
      mockDatamitsu.exec
        .mockResolvedValueOnce({ exitCode: 0, stderr: "", stdout: "{}" })
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({ exitCode: 0, stderr: "", stdout: "{}" });

      await pulumiDecrypt();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("2/3 succeeded"));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should detect YAML file type for .yaml and .yml", async () => {
      mockGlob.mockResolvedValue([
        path.join(root, ".pulumi", "meta.yaml.enc"),
        stateFile("dev.yml.enc"),
      ]);
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: "version: 1\n" });

      await pulumiDecrypt();

      for (const call of mockDatamitsu.exec.mock.calls) {
        expect(call[1]).toEqual(expect.arrayContaining(["--input-type", "yaml"]));
      }
      expect(await fs.readFile(stateFile("dev.yml"), "utf8")).toBe("version: 1\n");
    });

    it("should pass GPG_TTY to SOPS environment", async () => {
      mockGlob.mockResolvedValue([stateFile("dev.json.enc")]);
      mockGetGPGTTY.mockResolvedValue("/dev/ttys002");

      await pulumiDecrypt();

      expect(mockDatamitsu.exec.mock.calls[0][2].env.GPG_TTY).toBe("/dev/ttys002");
    });

    it("should handle GPG key not available error", async () => {
      mockGlob.mockResolvedValue([stateFile("dev.json.enc")]);
      const error = new Error("GPG key not found");
      mockDatamitsu.exec.mockRejectedValue(error);

      await pulumiDecrypt();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Decryption error"),
        expect.objectContaining({ message: expect.stringContaining("sops --decrypt failed") }),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
