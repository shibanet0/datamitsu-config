import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse, stringify } from "yaml";

import { yamlfmtYaml } from "../_yamlfmt_yaml";

const render = (originalContent: string) => yamlfmtYaml.content!({ originalContent } as never)!;

describe("yamlfmt configuration", () => {
  beforeEach(() => vi.stubGlobal("YAML", { parse, stringify }));
  afterEach(() => vi.unstubAllGlobals());

  /**
   * Doublestar would make the `**` excludes match, but yamlfmt 0.21 then reads every file argument
   * as a pattern too: `routes/[id]/schema.yaml` matches no file and is silently skipped. datamitsu
   * applies the same excludes through the tool's excludeGlobs, so nothing is lost without it.
   */
  it("leaves doublestar off, so bracketed paths are still formatted", () => {
    expect(parse(render(""))).not.toHaveProperty("doublestar");
  });
});
