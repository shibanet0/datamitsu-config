import { beforeEach, describe, expect, it, vi } from "vitest";

import { pulumiCommand } from "../index.js";

// Mock the action handlers
vi.mock("../encryptState");
vi.mock("../decryptState");
vi.mock("../cleanupState");

describe("pulumi command", () => {
  let mockPulumiEncrypt: any;
  let mockPulumiDecrypt: any;
  let mockPulumiCleanup: any;

  beforeEach(async () => {
    // Setup mocks
    const encryptModule = await import("../encryptState");
    mockPulumiEncrypt = vi.fn().mockResolvedValue(null);
    vi.mocked(encryptModule.pulumiEncrypt).mockImplementation(mockPulumiEncrypt);

    const decryptModule = await import("../decryptState");
    mockPulumiDecrypt = vi.fn().mockResolvedValue(null);
    vi.mocked(decryptModule.pulumiDecrypt).mockImplementation(mockPulumiDecrypt);

    const cleanupModule = await import("../cleanupState");
    mockPulumiCleanup = vi.fn().mockResolvedValue(null);
    vi.mocked(cleanupModule.pulumiCleanup).mockImplementation(mockPulumiCleanup);

    vi.clearAllMocks();
  });

  describe("command structure", () => {
    it("should have correct command name", () => {
      expect(pulumiCommand.name()).toBe("pulumi-sops");
    });

    it("should have a type argument", () => {
      const args = pulumiCommand.registeredArguments;
      expect(args).toHaveLength(1);
      expect(args.at(0)?.name()).toBe("type");
      expect(args.at(0)?.description).toBe("Type of operation");
    });

    it("should have correct choices", () => {
      const typeArg = pulumiCommand.registeredArguments[0];
      const choices = (typeArg as any).argChoices;

      expect(choices).toEqual(["encrypt-all-state", "decrypt-all-state", "cleanup-all-state"]);
    });
  });

  describe("command actions", () => {
    it("should call pulumiEncrypt for encrypt-all-state", async () => {
      await pulumiCommand.parseAsync(["encrypt-all-state"], { from: "user" });

      expect(mockPulumiEncrypt).toHaveBeenCalledTimes(1);
      expect(mockPulumiDecrypt).not.toHaveBeenCalled();
      expect(mockPulumiCleanup).not.toHaveBeenCalled();
    });

    it("should call pulumiDecrypt for decrypt-all-state", async () => {
      await pulumiCommand.parseAsync(["decrypt-all-state"], { from: "user" });

      expect(mockPulumiDecrypt).toHaveBeenCalledTimes(1);
      expect(mockPulumiEncrypt).not.toHaveBeenCalled();
      expect(mockPulumiCleanup).not.toHaveBeenCalled();
    });

    it("should call pulumiCleanup for cleanup-all-state", async () => {
      await pulumiCommand.parseAsync(["cleanup-all-state"], { from: "user" });

      expect(mockPulumiCleanup).toHaveBeenCalledTimes(1);
      expect(mockPulumiEncrypt).not.toHaveBeenCalled();
      expect(mockPulumiDecrypt).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should propagate errors from pulumiEncrypt", async () => {
      const error = new Error("Encryption failed");
      mockPulumiEncrypt.mockRejectedValue(error);

      await expect(
        pulumiCommand.parseAsync(["encrypt-all-state"], { from: "user" }),
      ).rejects.toThrow("Encryption failed");
    });

    it("should propagate errors from pulumiDecrypt", async () => {
      const error = new Error("Decryption failed");
      mockPulumiDecrypt.mockRejectedValue(error);

      await expect(
        pulumiCommand.parseAsync(["decrypt-all-state"], { from: "user" }),
      ).rejects.toThrow("Decryption failed");
    });

    it("should propagate errors from pulumiCleanup", async () => {
      const error = new Error("Cleanup failed");
      mockPulumiCleanup.mockRejectedValue(error);

      await expect(
        pulumiCommand.parseAsync(["cleanup-all-state"], { from: "user" }),
      ).rejects.toThrow("Cleanup failed");
    });
  });
});
