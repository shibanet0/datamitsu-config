import { execa } from "execa";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { datamitsuExec, getDatamitsuBinary } from "../datamitsu.js";

// Mock execa
vi.mock("execa");

describe("datamitsu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDatamitsuBinary", () => {
    it("should return a path to datamitsu.js", () => {
      const binaryPath = getDatamitsuBinary();

      expect(binaryPath).toContain("datamitsu.js");
      expect(binaryPath).toMatch(/\.m*js$/);
    });

    it("should return an absolute path", () => {
      const binaryPath = getDatamitsuBinary();

      // Path should start with / (Unix) or drive letter (Windows)
      expect(binaryPath).toMatch(/^(\/|[A-Z]:)/);
    });
  });

  describe("datamitsuExec", () => {
    it("should execute datamitsu with correct arguments", async () => {
      vi.mocked(execa).mockResolvedValue({
        exitCode: 0,
        stderr: "",
        stdout: "success",
      } as any);

      await datamitsuExec("sops", ["--encrypt", "file.yaml"]);

      const binaryPath = getDatamitsuBinary();

      expect(execa).toHaveBeenCalledWith(
        binaryPath,
        ["exec", "sops", "--", "--encrypt", "file.yaml"],
        undefined,
      );
    });

    it("should handle empty args", async () => {
      vi.mocked(execa).mockResolvedValue({
        exitCode: 0,
        stderr: "",
        stdout: "",
      } as any);

      await datamitsuExec("tool");

      const binaryPath = getDatamitsuBinary();

      expect(execa).toHaveBeenCalledWith(binaryPath, ["exec", "tool", "--"], undefined);
    });

    it("should handle undefined args", async () => {
      vi.mocked(execa).mockResolvedValue({
        exitCode: 0,
        stderr: "",
        stdout: "",
      } as any);

      await datamitsuExec("tool");

      const binaryPath = getDatamitsuBinary();

      expect(execa).toHaveBeenCalledWith(binaryPath, ["exec", "tool", "--"], undefined);
    });

    it("should pass through options", async () => {
      vi.mocked(execa).mockResolvedValue({
        exitCode: 0,
        stderr: "",
        stdout: "",
      } as any);

      const options = {
        cwd: "/custom/path",
        env: { FOO: "bar" },
      };

      await datamitsuExec("sops", ["--decrypt"], options);

      const binaryPath = getDatamitsuBinary();

      expect(execa).toHaveBeenCalledWith(binaryPath, ["exec", "sops", "--", "--decrypt"], options);
    });

    it("should return execa result", async () => {
      const mockResult = {
        command: "datamitsu",
        exitCode: 0,
        stderr: "test error",
        stdout: "test output",
      } as any;

      vi.mocked(execa).mockResolvedValue(mockResult);

      const result = await datamitsuExec("tool", ["arg1"]);

      expect(result).toBe(mockResult);
    });

    it("should propagate errors", async () => {
      const error = new Error("Command failed");
      vi.mocked(execa).mockRejectedValue(error);

      await expect(datamitsuExec("failing-tool", ["arg1"])).rejects.toThrow("Command failed");
    });

    it("should handle multiple arguments correctly", async () => {
      vi.mocked(execa).mockResolvedValue({
        exitCode: 0,
        stderr: "",
        stdout: "",
      } as any);

      await datamitsuExec("sops", ["--encrypt", "--in-place", "--input-type", "yaml", "file.yaml"]);

      const binaryPath = getDatamitsuBinary();

      expect(execa).toHaveBeenCalledWith(
        binaryPath,
        ["exec", "sops", "--", "--encrypt", "--in-place", "--input-type", "yaml", "file.yaml"],
        undefined,
      );
    });

    it("should handle arguments with spaces", async () => {
      vi.mocked(execa).mockResolvedValue({
        exitCode: 0,
        stderr: "",
        stdout: "",
      } as any);

      await datamitsuExec("tool", ["--message", "hello world"]);

      const binaryPath = getDatamitsuBinary();

      expect(execa).toHaveBeenCalledWith(
        binaryPath,
        ["exec", "tool", "--", "--message", "hello world"],
        undefined,
      );
    });
  });
});
