import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONCURRENCY_LIMIT,
  detectFileType,
  ENCRYPTED_FILE_SUFFIX,
  getDecryptedPath,
  getEncryptedPath,
  isEncryptedFile,
  PULUMI_ENCRYPTED_EXCLUDE_PATTERNS,
  PULUMI_ENCRYPTED_STATE_PATTERNS,
  PULUMI_STATE_PATTERNS,
  SOPS_EXIT_CODE_UNCHANGED,
} from "../constants.js";

describe("constants", () => {
  describe("constants values", () => {
    it("should have correct ENCRYPTED_FILE_SUFFIX", () => {
      expect(ENCRYPTED_FILE_SUFFIX).toBe(".enc");
    });

    it("should have correct PULUMI_STATE_PATTERNS", () => {
      expect(PULUMI_STATE_PATTERNS).toEqual([
        "**/.pulumi/meta.yaml",
        "**/.pulumi/stacks/**/*.{yaml,yml,json}",
      ]);
    });

    it("should have correct PULUMI_ENCRYPTED_STATE_PATTERNS", () => {
      expect(PULUMI_ENCRYPTED_STATE_PATTERNS).toEqual([
        "**/.pulumi/meta.yaml.enc",
        "**/.pulumi/stacks/**/*.{yaml,yml,json}.enc",
      ]);
    });

    it("should have correct PULUMI_ENCRYPTED_EXCLUDE_PATTERNS", () => {
      expect(PULUMI_ENCRYPTED_EXCLUDE_PATTERNS).toEqual([
        "**/*.json.enc",
        "**/*.yaml.enc",
        "**/*.yml.enc",
      ]);
    });

    it("should have correct DEFAULT_CONCURRENCY_LIMIT", () => {
      expect(DEFAULT_CONCURRENCY_LIMIT).toBe(5);
    });

    it("should have correct SOPS_EXIT_CODE_UNCHANGED", () => {
      expect(SOPS_EXIT_CODE_UNCHANGED).toBe(200);
    });
  });

  describe("detectFileType", () => {
    it("should detect JSON files", () => {
      expect(detectFileType("stack.json")).toBe("json");
      expect(detectFileType("dev.json")).toBe("json");
      expect(detectFileType("path/to/stack.json")).toBe("json");
    });

    it("should detect JSON files with .enc extension", () => {
      expect(detectFileType("stack.json.enc")).toBe("json");
      expect(detectFileType("dev.json.enc")).toBe("json");
      expect(detectFileType("path/to/stack.json.enc")).toBe("json");
    });

    it("should detect YAML files with .yaml extension", () => {
      expect(detectFileType("stack.yaml")).toBe("yaml");
      expect(detectFileType("meta.yaml")).toBe("yaml");
      expect(detectFileType("path/to/stack.yaml")).toBe("yaml");
    });

    it("should detect YAML files with .yml extension", () => {
      expect(detectFileType("stack.yml")).toBe("yaml");
      expect(detectFileType("meta.yml")).toBe("yaml");
      expect(detectFileType("path/to/stack.yml")).toBe("yaml");
    });

    it("should detect YAML files with .enc extension", () => {
      expect(detectFileType("stack.yaml.enc")).toBe("yaml");
      expect(detectFileType("meta.yml.enc")).toBe("yaml");
    });

    it("should default to YAML for unknown extensions", () => {
      expect(detectFileType("unknown.txt")).toBe("yaml");
      expect(detectFileType("noextension")).toBe("yaml");
      expect(detectFileType("file.xml")).toBe("yaml");
    });

    it("should be case-insensitive", () => {
      expect(detectFileType("STACK.JSON")).toBe("json");
      expect(detectFileType("STACK.YAML")).toBe("yaml");
      expect(detectFileType("Stack.Json")).toBe("json");
      expect(detectFileType("Stack.Yaml")).toBe("yaml");
    });
  });

  describe("getDecryptedPath", () => {
    it("should remove .enc suffix", () => {
      expect(getDecryptedPath("stack.json.enc")).toBe("stack.json");
      expect(getDecryptedPath("meta.yaml.enc")).toBe("meta.yaml");
      expect(getDecryptedPath("dev.yml.enc")).toBe("dev.yml");
    });

    it("should handle paths with directories", () => {
      expect(getDecryptedPath("/path/to/stack.json.enc")).toBe("/path/to/stack.json");
      expect(getDecryptedPath(".pulumi/stacks/dev.yaml.enc")).toBe(".pulumi/stacks/dev.yaml");
    });

    it("should return unchanged path if no .enc suffix", () => {
      expect(getDecryptedPath("stack.json")).toBe("stack.json");
      expect(getDecryptedPath("meta.yaml")).toBe("meta.yaml");
    });

    it("should only remove trailing .enc suffix", () => {
      expect(getDecryptedPath("file.enc.json.enc")).toBe("file.enc.json");
    });
  });

  describe("getEncryptedPath", () => {
    it("should add .enc suffix", () => {
      expect(getEncryptedPath("stack.json")).toBe("stack.json.enc");
      expect(getEncryptedPath("meta.yaml")).toBe("meta.yaml.enc");
      expect(getEncryptedPath("dev.yml")).toBe("dev.yml.enc");
    });

    it("should handle paths with directories", () => {
      expect(getEncryptedPath("/path/to/stack.json")).toBe("/path/to/stack.json.enc");
      expect(getEncryptedPath(".pulumi/stacks/dev.yaml")).toBe(".pulumi/stacks/dev.yaml.enc");
    });

    it("should add .enc even if already has .enc (double encryption)", () => {
      expect(getEncryptedPath("stack.json.enc")).toBe("stack.json.enc.enc");
    });
  });

  describe("isEncryptedFile", () => {
    it("should return true for files with .enc suffix", () => {
      expect(isEncryptedFile("stack.json.enc")).toBe(true);
      expect(isEncryptedFile("meta.yaml.enc")).toBe(true);
      expect(isEncryptedFile("dev.yml.enc")).toBe(true);
      expect(isEncryptedFile("/path/to/file.enc")).toBe(true);
    });

    it("should return false for files without .enc suffix", () => {
      expect(isEncryptedFile("stack.json")).toBe(false);
      expect(isEncryptedFile("meta.yaml")).toBe(false);
      expect(isEncryptedFile("dev.yml")).toBe(false);
      expect(isEncryptedFile("encryption.ts")).toBe(false);
    });

    it("should return false for files with .enc in middle", () => {
      expect(isEncryptedFile("file.enc.json")).toBe(false);
      expect(isEncryptedFile("encrypted.file.yaml")).toBe(false);
    });
  });
});
