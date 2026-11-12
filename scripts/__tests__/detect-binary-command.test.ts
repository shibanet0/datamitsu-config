import { describe, expect, it } from "vitest";

import { detectBinaryCommand } from "../../bin/detect-binary-command.js";

describe("detectBinaryCommand", () => {
  it.each([
    ["pnpm/12.14.0 npm/? node/v22.12.0 linux x64", "pnpm datamitsu"],
    ["npm/10.9.0 node/v22.12.0 linux x64 workspaces/false", "npm exec --no -- datamitsu"],
    ["yarn/4.9.1 npm/? node/v22.12.0 linux x64", "yarn datamitsu"],
    ["bun/1.2.0 npm/? node/v22.12.0 linux x64", "bun run datamitsu"],
    [undefined, "pnpm datamitsu"],
    ["pip/25.0 cpython/3.13", "pnpm datamitsu"],
  ])("detects the package manager from %s", (userAgent, want) => {
    expect(detectBinaryCommand(userAgent)).toBe(want);
  });
});
