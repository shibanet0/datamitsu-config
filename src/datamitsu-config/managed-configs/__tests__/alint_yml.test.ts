import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse, stringify } from "yaml";

import { alintYml } from "../_alint_yml";
import { ALINT_MANAGED_PATH, alintNamingRules, buildManagedAlintYaml } from "../../alint-defaults";

const render = (originalContent: string) => alintYml.content!({ originalContent } as never)!;
const OSS_BASELINE = "alint://bundled/oss-baseline@v1";

const ruleFor = (id: string) => {
  const rule = alintNamingRules.find((candidate) => candidate.id === id);
  if (!rule) {
    throw new Error(`no rule ${id}`);
  }
  // alint compiles these with Rust's regex crate; the syntax used here is the subset both share.
  return new RegExp(rule.pattern, "u");
};

describe("alint configuration", () => {
  beforeEach(() => vi.stubGlobal("YAML", { parse, stringify }));
  afterEach(() => vi.unstubAllGlobals());

  describe("managed naming rules", () => {
    it("renders every rule into the managed base as an error", () => {
      const base = parse(buildManagedAlintYaml());
      expect(base.version).toBe(1);
      expect(base.rules.map((rule: { id: string }) => rule.id)).toEqual(
        alintNamingRules.map((rule) => rule.id),
      );
      for (const rule of base.rules) {
        expect(rule.id).toMatch(/^s0-/u);
        expect(rule.kind).toBe("filename_regex");
        expect(rule.level).toBe("error");
      }
    });

    it.each([
      ["s0-js-ts-file-names", "button.tsx", true],
      ["s0-js-ts-file-names", "Button.tsx", true],
      ["s0-js-ts-file-names", "useNestedForm.ts", true],
      ["s0-js-ts-file-names", "knip.config.js", true],
      ["s0-js-ts-file-names", "state-guard.test.ts", true],
      ["s0-js-ts-file-names", "i18n.autoChangeLanguage.ts", true],
      ["s0-js-ts-file-names", "vite-env.d.ts", true],
      ["s0-js-ts-file-names", "[slug].tsx", true],
      ["s0-js-ts-file-names", "[...all].tsx", true],
      ["s0-js-ts-file-names", "+page.ts", true],
      ["s0-js-ts-file-names", "_app.tsx", true],
      ["s0-js-ts-file-names", "$postId.tsx", true],
      ["s0-js-ts-file-names", ".prettierrc.cjs", true],
      ["s0-js-ts-file-names", "__root.tsx", true],
      ["s0-js-ts-file-names", "posts.$postId.tsx", true],
      ["s0-js-ts-file-names", "posts_.$postId.edit.tsx", true],
      ["s0-js-ts-file-names", "$.tsx", true],
      ["s0-js-ts-file-names", "-components.tsx", true],
      ["s0-js-ts-file-names", "messages.en-US.ts", true],
      ["s0-js-ts-file-names", "user_pb.ts", true],
      ["s0-js-ts-file-names", "user_connect.ts", true],
      ["s0-js-ts-file-names", "hello+api.ts", true],
      ["s0-js-ts-file-names", "[id]+api.ts", true],
      ["s0-js-ts-file-names", "($lang)._index.tsx", true],
      ["s0-js-ts-file-names", "sitemap[.]xml.tsx", true],
      ["s0-js-ts-file-names", "{-$locale}.tsx", true],
      ["s0-js-ts-file-names", "refund_methods.spec.ts", false],
      ["s0-js-ts-file-names", "Bad_Name.ts", false],
      ["s0-js-ts-file-names", "bad name.ts", false],
      ["s0-markdown-file-names", "README.md", true],
      ["s0-markdown-file-names", "CODE_OF_CONDUCT.md", true],
      ["s0-markdown-file-names", "getting-started.md", true],
      ["s0-markdown-file-names", "README.ru.md", true],
      ["s0-markdown-file-names", ".example-usage.md", true],
      ["s0-markdown-file-names", "Getting_Started.md", false],
      ["s0-shell-file-names", "update-codegen.sh", true],
      ["s0-shell-file-names", "update_codegen.sh", false],
      ["s0-python-file-names", "__init__.py", true],
      ["s0-python-file-names", "state_guard.py", true],
      ["s0-python-file-names", "_helpers.py", true],
      ["s0-python-file-names", "state-guard.py", false],
      ["s0-go-file-names", "state_guard_test.go", true],
      ["s0-go-file-names", "user.pb.go", true],
      ["s0-go-file-names", "user_grpc.pb.go", true],
      ["s0-go-file-names", "zz_generated.deepcopy.go", true],
      ["s0-go-file-names", "query.sql.go", true],
      ["s0-go-file-names", "stateGuard.go", false],
      ["s0-yaml-file-names", "docker-compose.yml", true],
      ["s0-yaml-file-names", ".pre-commit-config.yaml", true],
      ["s0-yaml-file-names", "Taskfile.yaml", true],
      ["s0-yaml-file-names", "Chart.yaml", true],
      ["s0-yaml-file-names", "Taskfile.dist.yml", true],
      ["s0-yaml-file-names", "Taskfile.dist.yaml", true],
      ["s0-yaml-file-names", "values.prod.yaml", true],
      ["s0-yaml-file-names", "Values.yaml", false],
    ])("%s: %s → %s", (id, name, allowed) => {
      expect(ruleFor(id).test(name)).toBe(allowed);
    });
  });

  it("leaves GitHub-named YAML to GitHub", () => {
    const rule = parse(buildManagedAlintYaml()).rules.find(
      (candidate: { id: string }) => candidate.id === "s0-yaml-file-names",
    );
    expect(rule.paths).toEqual({ exclude: [".github/**"], include: ["**/*.{yaml,yml}"] });
  });

  describe("user config", () => {
    it("always allows the managed extends, which datamitsu links from outside the tree", () => {
      expect(parse(render(stringify({ allow_out_of_root: false }))).allow_out_of_root).toBe(true);
    });

    it("extends the bundled baseline and the managed naming rules by default", () => {
      expect(parse(render(""))).toEqual({
        allow_out_of_root: true,
        extends: [OSS_BASELINE, ALINT_MANAGED_PATH],
        version: 1,
      });
    });

    it("points the managed extends at .datamitsu/ from wherever the file is rendered", () => {
      const internal = alintYml.content!({
        datamitsuDirFromOutput: "..",
        placement: "internal",
      } as never)!;
      expect(parse(internal).extends).toEqual([OSS_BASELINE, "../alint-managed.yml"]);
    });

    it("rewrites the bare `oss-baseline` alint reads as a missing local path", () => {
      expect(parse(render(stringify({ extends: ["oss-baseline"] }))).extends).toEqual([
        OSS_BASELINE,
        ALINT_MANAGED_PATH,
      ]);
    });

    it("keeps the project's own extends, rules and order, and adds the managed file once", () => {
      const custom = {
        extends: ["alint://bundled/node@v1", "./team.alint.yml"],
        rules: [{ id: "custom", kind: "file_exists", paths: "README.md" }],
        version: 1,
      };
      const result = render(stringify(custom));
      expect(parse(result)).toEqual({
        ...custom,
        allow_out_of_root: true,
        extends: [...custom.extends, ALINT_MANAGED_PATH],
      });
      expect(render(result)).toBe(result);
    });

    it("accepts a single string extends", () => {
      expect(parse(render(stringify({ extends: "alint://bundled/rust@v1" }))).extends).toEqual([
        "alint://bundled/rust@v1",
        ALINT_MANAGED_PATH,
      ]);
    });
  });
});
