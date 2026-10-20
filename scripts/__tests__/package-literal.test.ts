import { describe, expect, it } from "vitest";

import { readPackageLiteral } from "../lib/package-literal.ts";

describe("managed package literal", () => {
  it("reads the JSON template without evaluating config code", () => {
    const manifest = {
      dependencies: { sample: "1.2.3" },
      devDependencies: { typescript: "6.0.3" },
      packageManager: "pnpm@12.5.1",
      scripts: { build: 'tool --config "file.json"' },
    };
    const escaped = JSON.stringify(manifest).replaceAll("\\", "\\\\");
    const source =
      'throw new Error("must not execute"); const config = { "package.json": { content: () => ' +
      "`" +
      escaped +
      "` } };";
    expect(readPackageLiteral(source)).toEqual(manifest);
  });

  it("fails rather than silently skipping a missing or malformed literal", () => {
    expect(() => readPackageLiteral("const config = {};")).toThrow("Could not find");
    expect(() =>
      readPackageLiteral('const config = {"package.json": {content: () => `broken`}}'),
    ).toThrow();
  });
});
