import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pulumiDecrypt } from "../decryptState.js";

// Mock dependencies
vi.mock("fast-glob");
vi.mock("../../../../lib/index.js");
vi.mock("../../../utils/tty.js");

describe("decryptState", () => {
  let mockGlob: any;
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("pulumiDecrypt", () => {
    it("should decrypt files successfully", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);

      await pulumiDecrypt();

      expect(mockGlob).toHaveBeenCalled();
      expect(mockGetGPGTTY).toHaveBeenCalled();
      expect(mockDatamitsu.exec).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1/1 succeeded"));
    });

    it("should handle no encrypted files found", async () => {
      mockGlob.mockResolvedValue([]);

      await pulumiDecrypt();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("0 encrypted file(s)"));
      expect(mockDatamitsu.exec).not.toHaveBeenCalled();
    });

    it("should decrypt with --output flag", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);

      await pulumiDecrypt();

      expect(mockDatamitsu.exec).toHaveBeenCalledWith(
        "sops",
        expect.arrayContaining([
          "--decrypt",
          "--output",
          "/repo/.pulumi/stacks/dev.json",
          "/repo/.pulumi/stacks/dev.json.enc",
        ]),
        expect.any(Object),
      );
    });

    it("should process files in batches of 5", async () => {
      const files = Array.from({ length: 12 }, (_, i) => `/repo/stack${i}.json.enc`);
      mockGlob.mockResolvedValue(files);

      await pulumiDecrypt();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("12 encrypted file(s)"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("12/12 succeeded"));
      expect(mockDatamitsu.exec).toHaveBeenCalledTimes(12);
    });

    it("should aggregate errors from multiple files", async () => {
      const files = ["/repo/.pulumi/stacks/dev.json.enc", "/repo/.pulumi/stacks/prod.json.enc"];
      mockGlob.mockResolvedValue(files);

      mockDatamitsu.exec.mockRejectedValue(new Error("Decryption failed"));

      await pulumiDecrypt();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("0/2 succeeded"));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle partial batch failures", async () => {
      const files = [
        "/repo/.pulumi/stacks/dev.json.enc",
        "/repo/.pulumi/stacks/prod.json.enc",
        "/repo/.pulumi/stacks/staging.json.enc",
      ];
      mockGlob.mockResolvedValue(files);

      // First call succeeds, second fails, third succeeds
      mockDatamitsu.exec
        .mockResolvedValueOnce({ exitCode: 0, stderr: "", stdout: "" })
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({ exitCode: 0, stderr: "", stdout: "" });

      await pulumiDecrypt();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("2/3 succeeded"));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should detect JSON file type from .enc file", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);

      await pulumiDecrypt();

      const execCall = mockDatamitsu.exec.mock.calls[0];
      expect(execCall[1]).toContain("--input-type");
      expect(execCall[1]).toContain("json");
    });

    it("should detect YAML file type from .enc file", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/meta.yaml.enc"]);

      await pulumiDecrypt();

      const execCall = mockDatamitsu.exec.mock.calls[0];
      expect(execCall[1]).toContain("--input-type");
      expect(execCall[1]).toContain("yaml");
    });

    it("should pass GPG_TTY to SOPS environment", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);
      mockGetGPGTTY.mockResolvedValue("/dev/ttys002");

      await pulumiDecrypt();

      const execCall = mockDatamitsu.exec.mock.calls[0];
      const options = execCall[2];
      expect(options.env.GPG_TTY).toBe("/dev/ttys002");
    });

    it("should generate correct output path (remove .enc)", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);

      await pulumiDecrypt();

      const execCall = mockDatamitsu.exec.mock.calls[0];
      const args = execCall[1];
      const outputIndex = args.indexOf("--output");
      const outputPath = args[outputIndex + 1];

      expect(outputPath).toBe("/repo/.pulumi/stacks/dev.json");
    });

    it("should handle exactly one batch size of files", async () => {
      const files = Array.from({ length: 5 }, (_, i) => `/repo/stack${i}.json.enc`);
      mockGlob.mockResolvedValue(files);

      await pulumiDecrypt();

      expect(mockDatamitsu.exec).toHaveBeenCalledTimes(5);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("5/5 succeeded"));
    });

    it("should handle single file", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/meta.yaml.enc"]);

      await pulumiDecrypt();

      expect(mockDatamitsu.exec).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1/1 succeeded"));
    });

    it("should not exit with error code if all succeeded", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);

      await pulumiDecrypt();

      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it("should use correct SOPS command structure", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);

      await pulumiDecrypt();

      expect(mockDatamitsu.exec).toHaveBeenCalledWith(
        "sops",
        [
          "--decrypt",
          "--input-type",
          "json",
          "--output-type",
          "json",
          "--output",
          "/repo/.pulumi/stacks/dev.json",
          "/repo/.pulumi/stacks/dev.json.enc",
        ],
        expect.objectContaining({
          cwd: process.cwd(),
          env: expect.objectContaining({
            GPG_TTY: "/dev/ttys001",
          }),
        }),
      );
    });

    it("should handle .yml extension", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.yml.enc"]);

      await pulumiDecrypt();

      const execCall = mockDatamitsu.exec.mock.calls[0];
      const args = execCall[1];

      expect(args).toContain("--input-type");
      expect(args).toContain("yaml");

      const outputIndex = args.indexOf("--output");
      expect(args[outputIndex + 1]).toBe("/repo/.pulumi/stacks/dev.yml");
    });

    it("should log relative paths correctly", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);

      await pulumiDecrypt();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Decrypting:"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Decrypted:"));
    });

    it("should handle GPG key not available error", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);

      const error = new Error("GPG key not found");
      mockDatamitsu.exec.mockRejectedValue(error);

      await pulumiDecrypt();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Decryption error"),
        error,
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should process meta.yaml files", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/meta.yaml.enc"]);

      await pulumiDecrypt();

      expect(mockDatamitsu.exec).toHaveBeenCalledWith(
        "sops",
        expect.arrayContaining(["--output", "/repo/.pulumi/meta.yaml"]),
        expect.any(Object),
      );
    });
  });
});
