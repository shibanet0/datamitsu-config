import { afterEach, beforeEach, vi } from "vitest";

// Mock the global facts() function from datamitsu
// This function is injected by the Goja VM at runtime
// but needs to be mocked for tests
// @ts-expect-error - facts is declared in datamitsu.config.d.ts but not available in test env
// cSpell:ignore Goja
globalThis.facts = (): Facts => ({
  arch: "amd64",
  binaryCommand: "datamitsu",
  binaryPath: "/usr/local/bin/datamitsu",
  env: {
    CI: "false",
  },
  isInGitRepo: true,
  isMonorepo: false,
  libc: "glibc",
  os: "linux",
  packageName: "@shibanet0/datamitsu-config",
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
