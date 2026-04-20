import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pulumiCleanup } from "../cleanupState.js";

// Mock dependencies
vi.mock("execa");
vi.mock("fast-glob");
vi.mock("node:fs/promises");
vi.mock("../../../../lib/index.js");
vi.mock("../../../utils/tty.js");

describe("cleanupState", () => {
  let mockExeca: any;
  let mockGlob: any;
  let mockFs: any;
  let mockDatamitsu: any;
  let consoleSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let processCwdSpy: any;

  beforeEach(async () => {
    // Setup console spies
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock process.cwd
    processCwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/repo");

    // Setup execa mock
    const execaModule = await import("execa");
    mockExeca = vi.fn();
    vi.mocked(execaModule.execa).mockImplementation(mockExeca);

    // Setup fast-glob mock
    const fastGlob = await import("fast-glob");
    mockGlob = vi.fn().mockResolvedValue([]);
    vi.mocked(fastGlob).default = { glob: mockGlob } as any;

    // Setup fs mock
    mockFs = {
      access: vi.fn(),
      unlink: vi.fn(),
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
    (ttyModule.getGPGTTY as any).mockResolvedValue("/dev/ttys001");

    // Default git responses (safe repository)
    mockExeca.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--git-dir") {
        return Promise.resolve({ stdout: ".git" });
      }
      if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--show-toplevel") {
        return Promise.resolve({ stdout: "/repo" });
      }
      if (cmd === "git" && args[0] === "status" && args[1] === "--porcelain") {
        return Promise.resolve({ stdout: "" });
      }
      if (cmd === "git" && args[0] === "log") {
        return Promise.resolve({ stdout: "" });
      }
      return Promise.resolve({ exitCode: 0, stderr: "", stdout: "" });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("git safety checks", () => {
    it("should fail if not in git repo", async () => {
      mockExeca.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--git-dir") {
          return Promise.reject(new Error("not a git repository"));
        }
        return Promise.resolve({ stdout: "" });
      });

      await expect(pulumiCleanup()).rejects.toThrow("Not in a git repository");
    });

    it("should fail if not at repo root", async () => {
      processCwdSpy.mockReturnValue("/repo/subdir");

      mockExeca.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--git-dir") {
          return Promise.resolve({ stdout: ".git" });
        }
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--show-toplevel") {
          return Promise.resolve({ stdout: "/repo" });
        }
        return Promise.resolve({ stdout: "" });
      });

      await expect(pulumiCleanup()).rejects.toThrow("Not at repository root");
    });

    it("should fail if uncommitted changes exist", async () => {
      mockExeca.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--git-dir") {
          return Promise.resolve({ stdout: ".git" });
        }
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--show-toplevel") {
          return Promise.resolve({ stdout: "/repo" });
        }
        if (cmd === "git" && args[0] === "status" && args[1] === "--porcelain") {
          return Promise.resolve({ stdout: "M file.ts\nA new.ts" });
        }
        return Promise.resolve({ stdout: "" });
      });

      await expect(pulumiCleanup()).rejects.toThrow("Uncommitted changes detected");
    });

    it("should fail if unpushed commits exist", async () => {
      mockExeca.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--git-dir") {
          return Promise.resolve({ stdout: ".git" });
        }
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--show-toplevel") {
          return Promise.resolve({ stdout: "/repo" });
        }
        if (cmd === "git" && args[0] === "status" && args[1] === "--porcelain") {
          return Promise.resolve({ stdout: "" });
        }
        if (cmd === "git" && args[0] === "log") {
          return Promise.resolve({ stdout: "abc1234 Unpushed commit" });
        }
        return Promise.resolve({ stdout: "" });
      });

      await expect(pulumiCleanup()).rejects.toThrow("Unpushed commits detected");
    });

    it("should warn but continue if no upstream branch", async () => {
      mockExeca.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--git-dir") {
          return Promise.resolve({ stdout: ".git" });
        }
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--show-toplevel") {
          return Promise.resolve({ stdout: "/repo" });
        }
        if (cmd === "git" && args[0] === "status" && args[1] === "--porcelain") {
          return Promise.resolve({ stdout: "" });
        }
        if (cmd === "git" && args[0] === "log") {
          const error: any = new Error("no upstream branch");
          error.message = "fatal: no upstream configured for branch";
          return Promise.reject(error);
        }
        return Promise.resolve({ stdout: "" });
      });

      mockGlob.mockResolvedValue([]);

      await pulumiCleanup();

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("No upstream branch"));
    });

    it("should pass all safety checks in clean repo", async () => {
      mockGlob.mockResolvedValue([]);

      await expect(pulumiCleanup()).resolves.not.toThrow();

      expect(mockExeca).toHaveBeenCalledWith("git", ["rev-parse", "--git-dir"], expect.any(Object));
    });
  });

  describe("file cleanup", () => {
    it("should verify and remove files", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);
      mockFs.access.mockResolvedValue();
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: "decrypted" });

      await pulumiCleanup();

      expect(mockFs.unlink).toHaveBeenCalledWith("/repo/.pulumi/stacks/dev.json");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Removed:"));
    });

    it("should skip if original file does not exist", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);
      mockFs.access.mockRejectedValue(new Error("ENOENT"));

      await pulumiCleanup();

      expect(mockFs.unlink).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No unencrypted files"));
    });

    it("should keep original if verification fails", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/bad.json.enc"]);
      mockFs.access.mockResolvedValue();
      mockDatamitsu.exec.mockRejectedValue(new Error("SOPS failed"));

      await pulumiCleanup();

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("failed verification"));
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    it("should handle no encrypted files found", async () => {
      mockGlob.mockResolvedValue([]);

      await pulumiCleanup();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No unencrypted files"));
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    it("should handle multiple files", async () => {
      mockGlob.mockResolvedValue([
        "/repo/.pulumi/stacks/dev.json.enc",
        "/repo/.pulumi/stacks/prod.yaml.enc",
        "/repo/.pulumi/meta.yaml.enc",
      ]);
      mockFs.access.mockResolvedValue();
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: "decrypted" });

      await pulumiCleanup();

      expect(mockFs.unlink).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("3 unencrypted file(s)"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("3/3 removed"));
    });

    it("should handle mixed verification results", async () => {
      mockGlob.mockResolvedValue([
        "/repo/.pulumi/stacks/good.json.enc",
        "/repo/.pulumi/stacks/bad.json.enc",
      ]);
      mockFs.access.mockResolvedValue();

      // First verify succeeds, second fails
      mockDatamitsu.exec
        .mockResolvedValueOnce({ exitCode: 0, stdout: "decrypted" })
        .mockRejectedValueOnce(new Error("SOPS failed"));

      await pulumiCleanup();

      expect(mockFs.unlink).toHaveBeenCalledTimes(1);
      expect(mockFs.unlink).toHaveBeenCalledWith("/repo/.pulumi/stacks/good.json");
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should handle unlink errors gracefully", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);
      mockFs.access.mockResolvedValue();
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: "decrypted" });
      mockFs.unlink.mockRejectedValue(new Error("Permission denied"));

      await pulumiCleanup();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to remove"),
        expect.any(Error),
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("0/1 removed"));
    });

    it("should verify each encrypted file with SOPS", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);
      mockFs.access.mockResolvedValue();
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: "decrypted" });

      await pulumiCleanup();

      expect(mockDatamitsu.exec).toHaveBeenCalledWith(
        "sops",
        [
          "--decrypt",
          "--input-type",
          "json",
          "--output-type",
          "json",
          "/repo/.pulumi/stacks/dev.json.enc",
        ],
        expect.objectContaining({
          env: expect.objectContaining({
            GPG_TTY: "/dev/ttys001",
          }),
        }),
      );
    });

    it("should show relative paths in output", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.json.enc"]);
      mockFs.access.mockResolvedValue();
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: "decrypted" });

      await pulumiCleanup();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(".pulumi/stacks/dev.json"));
    });

    it("should handle YAML files", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/meta.yaml.enc"]);
      mockFs.access.mockResolvedValue();
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: "decrypted" });

      await pulumiCleanup();

      expect(mockDatamitsu.exec).toHaveBeenCalledWith(
        "sops",
        expect.arrayContaining(["--input-type", "yaml"]),
        expect.any(Object),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle detached HEAD state", async () => {
      mockExeca.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--git-dir") {
          return Promise.resolve({ stdout: ".git" });
        }
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--show-toplevel") {
          return Promise.resolve({ stdout: "/repo" });
        }
        if (cmd === "git" && args[0] === "status" && args[1] === "--porcelain") {
          return Promise.resolve({ stdout: "" });
        }
        if (cmd === "git" && args[0] === "log") {
          const error: any = new Error("no upstream");
          error.message = "fatal: no upstream configured for branch";
          return Promise.reject(error);
        }
        return Promise.resolve({ stdout: "" });
      });

      mockGlob.mockResolvedValue([]);

      await expect(pulumiCleanup()).resolves.not.toThrow();
    });

    it("should handle .yml extension", async () => {
      mockGlob.mockResolvedValue(["/repo/.pulumi/stacks/dev.yml.enc"]);
      mockFs.access.mockResolvedValue();
      mockDatamitsu.exec.mockResolvedValue({ exitCode: 0, stdout: "decrypted" });

      await pulumiCleanup();

      expect(mockFs.unlink).toHaveBeenCalledWith("/repo/.pulumi/stacks/dev.yml");
    });

    it("should handle empty status output (clean working directory)", async () => {
      mockGlob.mockResolvedValue([]);

      await expect(pulumiCleanup()).resolves.not.toThrow();
    });
  });
});
