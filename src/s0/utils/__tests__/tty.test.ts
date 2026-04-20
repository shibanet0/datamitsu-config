import { execa } from "execa";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getGPGTTY } from "../tty.js";

// Mock execa
vi.mock("execa");

describe("tty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGPGTTY", () => {
    it("should return TTY path on success", async () => {
      vi.mocked(execa).mockResolvedValue({
        command: "tty",
        escapedCommand: "tty",
        exitCode: 0,
        failed: false,
        isCanceled: false,
        killed: false,
        stderr: "",
        stdout: "/dev/ttys001",
        timedOut: false,
      } as any);

      const result = await getGPGTTY();

      expect(result).toBe("/dev/ttys001");
      expect(execa).toHaveBeenCalledWith("tty", [], {
        stdio: ["inherit", "pipe", "pipe"],
      });
    });

    it("should trim whitespace from TTY path", async () => {
      vi.mocked(execa).mockResolvedValue({
        exitCode: 0,
        stderr: "",
        stdout: "  /dev/ttys002  \n",
      } as any);

      const result = await getGPGTTY();

      expect(result).toBe("/dev/ttys002");
    });

    it("should fallback to /dev/tty on error", async () => {
      vi.mocked(execa).mockRejectedValue(new Error("tty command failed"));

      const result = await getGPGTTY();

      expect(result).toBe("/dev/tty");
    });

    it("should fallback to /dev/tty on command not found", async () => {
      const error = new Error("Command not found") as any;
      error.code = "ENOENT";
      vi.mocked(execa).mockRejectedValue(error);

      const result = await getGPGTTY();

      expect(result).toBe("/dev/tty");
    });

    it("should fallback to /dev/tty on permission denied", async () => {
      const error = new Error("Permission denied") as any;
      error.code = "EACCES";
      vi.mocked(execa).mockRejectedValue(error);

      const result = await getGPGTTY();

      expect(result).toBe("/dev/tty");
    });

    it("should fallback to /dev/tty when not in TTY context", async () => {
      const error = new Error("not a tty") as any;
      error.exitCode = 1;
      vi.mocked(execa).mockRejectedValue(error);

      const result = await getGPGTTY();

      expect(result).toBe("/dev/tty");
    });

    it("should handle different TTY device names", async () => {
      const ttyDevices = [
        "/dev/ttys001",
        "/dev/ttys010",
        "/dev/tty1",
        "/dev/pts/0",
        "/dev/console",
      ];

      for (const device of ttyDevices) {
        vi.mocked(execa).mockResolvedValue({
          exitCode: 0,
          stderr: "",
          stdout: device,
        } as any);

        const result = await getGPGTTY();
        expect(result).toBe(device);
      }
    });
  });
});
