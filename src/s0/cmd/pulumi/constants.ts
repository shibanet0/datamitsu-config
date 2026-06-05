/**
 * Constants and utilities for Pulumi SOPS state management
 */

/**
 * File extension for encrypted files
 */
export const ENCRYPTED_FILE_SUFFIX = ".enc" as const;

/**
 * Glob patterns for unencrypted Pulumi state files
 */
export const PULUMI_STATE_PATTERNS = [
  "**/.pulumi/meta.yaml",
  "**/.pulumi/stacks/**/*.{yaml,yml,json}",
] as const;

/**
 * Glob patterns for encrypted Pulumi state files
 */
export const PULUMI_ENCRYPTED_STATE_PATTERNS = [
  "**/.pulumi/meta.yaml.enc",
  "**/.pulumi/stacks/**/*.{yaml,yml,json}.enc",
] as const;

/**
 * Patterns to exclude (already encrypted)
 */
export const PULUMI_ENCRYPTED_EXCLUDE_PATTERNS = [
  "**/*.json.enc",
  "**/*.yaml.enc",
  "**/*.yml.enc",
] as const;

/**
 * Concurrent SOPS operations limit (conservative for GPG agent)
 */
export const DEFAULT_CONCURRENCY_LIMIT = 5;

/**
 * SOPS exit code for unchanged files
 */
export const SOPS_EXIT_CODE_UNCHANGED = 200;

/**
 * Supported file types for SOPS operations
 */
export type SopsFileType = "json" | "yaml";

/**
 * Detect file type from path
 *
 * @param filePath Path to the file
 * @returns 'json' if JSON file, 'yaml' otherwise
 */
export function detectFileType(filePath: string): SopsFileType {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".json") || lower.endsWith(".json.enc")) {
    return "json";
  }
  return "yaml";
}

/**
 * Get original path from encrypted file
 *
 * @param filePath Encrypted file path
 * @returns File path without .enc suffix
 */
export function getDecryptedPath(filePath: string): string {
  return filePath.replace(/\.enc$/, "");
}

/**
 * Get output path for encrypted file
 *
 * @param filePath Original file path
 * @returns File path with .enc suffix
 */
export function getEncryptedPath(filePath: string): string {
  return `${filePath}${ENCRYPTED_FILE_SUFFIX}`;
}

/**
 * Check if file is encrypted
 *
 * @param filePath File path to check
 * @returns True if file has .enc suffix
 */
export function isEncryptedFile(filePath: string): boolean {
  return filePath.endsWith(ENCRYPTED_FILE_SUFFIX);
}
