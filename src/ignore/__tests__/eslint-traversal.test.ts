import { ESLint } from "eslint";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GLOB_EXCLUDE } from "../../globs/globs";

// Pattern-string pins cannot tell a directory glob from one that also swallows a source file with
// a similar name, so this runs ESLint's own traversal over a fixture tree.
const skippedDirectories = [
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  "coverage",
  "generated",
  "storybook-static",
  ".turbo",
  ".next",
  ".pnpm-store",
  "playwright-report-html",
  "playwright-report-custom",
];

const lookalikeSources = [
  "src/playwright-report-parser.js",
  "src/vendor-utils.js",
  "src/generated-types.js",
  "src/coverage-report.js",
  "src/output-format.js",
  "src/build-tools.js",
  "src/dist-info.js",
];

let root = "";

const lintedFiles = async (): Promise<string[]> => {
  const eslint = new ESLint({
    cwd: root,
    overrideConfig: [{ ignores: GLOB_EXCLUDE }, { files: ["**/*.js"] }],
    overrideConfigFile: true,
  });
  const results = await eslint.lintFiles(["."]);
  return results.map((result) => path.relative(root, result.filePath)).toSorted();
};

describe("ESLint ignore traversal", () => {
  beforeAll(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "ignore-eslint-")));
    const files = [
      ...skippedDirectories.flatMap((dir) => [`${dir}/a.js`, `pkg/${dir}/deep/b.js`]),
      ...lookalikeSources,
      "src/index.js",
    ];
    for (const file of files) {
      await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await fs.writeFile(path.join(root, file), "export const value = 1;\n");
    }
  });

  afterAll(async () => {
    await fs.rm(root, { force: true, recursive: true });
  });

  it("skips every ignored directory at the root and nested, and nothing else", async () => {
    expect(await lintedFiles()).toEqual([...lookalikeSources, "src/index.js"].toSorted());
  });
});
