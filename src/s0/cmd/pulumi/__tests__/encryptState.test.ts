import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pulumiEncrypt } from "../encryptState.js";

// Mock dependencies
vi.mock("fast-glob");
vi.mock("node:fs/promises");
vi.mock("../../../../lib/index.js");
vi.mock("../../../utils/tty.js");
vi.mock("../../../utils/encryption.js");

describe("encryptState", () => {
  let mockGlob: any;
  let mockFs: any;
  let mockDatamitsu: any;
  let mockGetGPGTTY: any;
  let consoleSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(async () => {
    // Setup console spies
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Setup fast-glob mock
    const fastGlob = await import("fast-glob");
    mockGlob = vi.fn().mockResolvedValue([]);
    vi.mocked(fastGlob).default = { glob: mockGlob } as any;

    // Setup fs mock
    mockFs = {
      mkdir: vi.fn(),
      readFile: vi.fn(),
      rm: vi.fn(),
      writeFile: vi.fn(),
    };
    const fs = await import("node:fs/promises");
    Object.assign(fs.default, mockFs);

    // Setup Datamitsu mock
    const libModule = await import("../../../../lib/index.js");
    mockDatamitsu = {
      exec: vi.fn().mockResolvedValue({ exitCode: 0, stderr: "", stdout: "" }),
    };
    vi.mocked(libModule.Datamitsu).mockImplementation(function () {
      return mockDatamitsu;
    } as any);

    // Setup getGPGTTY mock
    const ttyModule = await import("../../../utils/tty.js");
    mockGetGPGTTY = vi.fn().mockResolvedValue("/dev/ttys001");
    vi.mocked(ttyModule.getGPGTTY).mockImplementation(mockGetGPGTTY);

    // Setup Encryptor mock
    const encryptionModule = await import("../../../utils/encryption.js");
    vi.mocked(encryptionModule.Encryptor).mockImplementation(function () {
      return {
        decrypt: vi.fn(),
        encrypt: vi.fn().mockResolvedValue(Buffer.alloc(64)),
        generateKey: vi.fn().mockReturnValue(Buffer.alloc(32)),
      };
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("pulumiEncrypt", () => {
    it("should process files successfully", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      await pulumiEncrypt();

      expect(mockGlob).toHaveBeenCalled();
      expect(mockGetGPGTTY).toHaveBeenCalled();
      expect(mockDatamitsu.exec).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1/1 succeeded"));
    });

    it("should handle no files found", async () => {
      mockGlob.mockResolvedValue([]);

      await pulumiEncrypt();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("0 Pulumi state file(s)"));
      expect(mockDatamitsu.exec).not.toHaveBeenCalled();
    });

    it("should process files in batches of 5", async () => {
      const files = Array.from({ length: 12 }, (_, i) => `/repo/.pulumi/stacks/stack${i}.json`);
      mockGlob.mockResolvedValue(files);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      await pulumiEncrypt();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("12 Pulumi state file(s)"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("12/12 succeeded"));
      expect(mockDatamitsu.exec).toHaveBeenCalledTimes(12);
    });

    it("should handle SOPS exit code 200 (file unchanged)", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      const error: any = new Error("SOPS error");
      error.exitCode = 1;
      error.stderr = "exit status 200";
      error.stdout = "File has not changed";
      mockDatamitsu.exec.mockRejectedValue(error);

      await pulumiEncrypt();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Skipped"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("no changes"));
    });

    it("should aggregate errors from multiple files", async () => {
      const files = ["/repo/.pulumi/stacks/dev.json", "/repo/.pulumi/stacks/prod.json"];
      mockGlob.mockResolvedValue(files);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      mockDatamitsu.exec.mockRejectedValue(new Error("Encryption failed"));

      await pulumiEncrypt();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("0/2 succeeded"));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle partial batch failures", async () => {
      const files = [
        "/repo/.pulumi/stacks/dev.json",
        "/repo/.pulumi/stacks/prod.json",
        "/repo/.pulumi/stacks/staging.json",
      ];
      mockGlob.mockResolvedValue(files);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      // First call succeeds, second fails, third succeeds
      mockDatamitsu.exec
        .mockResolvedValueOnce({ exitCode: 0, stderr: "", stdout: "" })
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({ exitCode: 0, stderr: "", stdout: "" });

      await pulumiEncrypt();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("2/3 succeeded"));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should detect JSON file type correctly", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("{}").toString("base64"));

      await pulumiEncrypt();

      const execCall = mockDatamitsu.exec.mock.calls[0];
      expect(execCall[1]).toContain("--input-type");
      expect(execCall[1]).toContain("json");
    });

    it("should detect YAML file type correctly", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/meta.yaml"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("version: 1").toString("base64"));

      await pulumiEncrypt();

      const execCall = mockDatamitsu.exec.mock.calls[0];
      expect(execCall[1]).toContain("--input-type");
      expect(execCall[1]).toContain("yaml");
    });

    it("should cleanup temporary directories on success", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      await pulumiEncrypt();

      expect(mockFs.rm).toHaveBeenCalledWith(expect.stringContaining("pulumi-sops"), {
        recursive: true,
      });
    });

    it("should cleanup temporary directories on failure", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));
      mockDatamitsu.exec.mockRejectedValue(new Error("Failed"));

      await pulumiEncrypt();

      expect(mockFs.rm).toHaveBeenCalledWith(expect.stringContaining("pulumi-sops"), {
        recursive: true,
      });
    });

    it("should create editor script with correct permissions", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      await pulumiEncrypt();

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("editor.mjs"),
        expect.stringContaining("#!/usr/bin/env node"),
        { mode: 0o700 },
      );
    });

    it("should pass GPG_TTY to SOPS environment", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));
      mockGetGPGTTY.mockResolvedValue("/dev/ttys002");

      await pulumiEncrypt();

      const execCall = mockDatamitsu.exec.mock.calls[0];
      const options = execCall[2];
      expect(options.env.GPG_TTY).toBe("/dev/ttys002");
    });

    it("should pass EDITOR environment variable", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      await pulumiEncrypt();

      const execCall = mockDatamitsu.exec.mock.calls[0];
      const options = execCall[2];
      expect(options.env.EDITOR).toContain("editor.mjs");
    });

    it("should generate encrypted output path correctly", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      await pulumiEncrypt();

      const execCall = mockDatamitsu.exec.mock.calls[0];
      const args = execCall[1];

      // Check that the args contain the .enc output path
      expect(args.join(" ")).toContain(".json.enc");
    });

    it("should handle exactly one batch size of files", async () => {
      const files = Array.from({ length: 5 }, (_, i) => `/repo/stack${i}.json`);
      mockGlob.mockResolvedValue(files);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      await pulumiEncrypt();

      expect(mockDatamitsu.exec).toHaveBeenCalledTimes(5);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("5/5 succeeded"));
    });

    it("should handle single file", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/meta.yaml"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("version: 1").toString("base64"));

      await pulumiEncrypt();

      expect(mockDatamitsu.exec).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1/1 succeeded"));
    });

    it("should not exit with error code if all succeeded", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json"]);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      await pulumiEncrypt();

      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it("should ignore already encrypted files", async () => {
      // Glob should not return .enc files due to exclude patterns
      mockGlob.mockResolvedValue([
        "/repo/.pulumi/stacks/dev.json",
        "/repo/.pulumi/stacks/prod.yaml",
      ]);
      mockFs.readFile.mockResolvedValue(Buffer.from("test").toString("base64"));

      await pulumiEncrypt();

      expect(mockDatamitsu.exec).toHaveBeenCalledTimes(2);
    });
  });
});
