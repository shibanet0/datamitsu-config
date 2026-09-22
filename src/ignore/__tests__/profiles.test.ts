import { describe, expect, it } from "vitest";

import { ignorePaths } from "../../apps/cspell/ignore";
import { ignoreGroups } from "../../datamitsu-config/ignore";
import { trufflehogExcludePaths } from "../../datamitsu-config/managed-configs/_trufflehog_exclude_paths_txt";
import { yamlIgnore } from "../../datamitsu-config/managed-configs/shared";
import { GLOB_EXCLUDE, toOxlintIgnorePatterns } from "../../globs/globs";
import { resolve } from "../profile";
import { cspellProfile } from "../profiles/cspell";
import { eslintProfile } from "../profiles/eslint";
import { gitignoreProfile } from "../profiles/gitignore";
import { trufflehogProfile } from "../profiles/trufflehog";
import { yamlProfile } from "../profiles/yaml";

describe("consumer profiles", () => {
  it("feeds cspell, YAML and trufflehog from their own profiles", () => {
    expect(resolve(cspellProfile)).toEqual(ignorePaths);
    expect(resolve(yamlProfile)).toEqual(yamlIgnore);
    expect(resolve(trufflehogProfile)).toEqual(trufflehogExcludePaths);
  });

  it("feeds ESLint from its ordered profile", () => {
    expect(resolve(eslintProfile)).toEqual(GLOB_EXCLUDE);
  });

  it("expands finite extglobs in order, including multiple groups", () => {
    expect(toOxlintIgnorePatterns(["**/auto-import?(s).@(ts|js)"])).toEqual([
      "**/auto-import.ts",
      "**/auto-import.js",
      "**/auto-imports.ts",
      "**/auto-imports.js",
    ]);
  });

  it.each(["*", "+", "!"])("rejects the non-finite %s extglob", (operator) => {
    expect(() => toOxlintIgnorePatterns([`**/${operator}(a|b).ts`])).toThrow(
      /cannot be handed to oxlint/,
    );
  });

  it("feeds the gitignore consumer from the grouped profile", () => {
    expect(resolve(gitignoreProfile)).toEqual(ignoreGroups);
    expect(Object.keys(resolve(gitignoreProfile))).toEqual(Object.keys(ignoreGroups));
  });
});
