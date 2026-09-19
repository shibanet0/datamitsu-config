import { describe, expect, it } from "vitest";

import { defineConfig } from "..";

const workspacesOf = (config: ReturnType<typeof defineConfig>) =>
  config.workspaces as Record<string, { entry?: string[]; ignoreMembers?: string[] }>;

const rootOf = (config: ReturnType<typeof defineConfig>) => workspacesOf(config)["."];

describe("root workspace", () => {
  it("restates the root under `.`", () => {
    // knip matches `workspaces` keys against the workspace name, and `"**"` does not match the
    // root's name. A config carrying only `"**"` leaves the root on knip's built-in defaults, so
    // every top-level entry pattern silently stops applying.
    const config = defineConfig();

    expect(rootOf(config)?.entry).toEqual(expect.arrayContaining(["eslint.config.mjs"]));
    expect(config.entry).toBeUndefined();
  });

  it("routes a top-level entry override to the root, keeping the managed configs", () => {
    const config = defineConfig({ entry: ["src/cli.ts"] });

    expect(rootOf(config)?.entry).toEqual(
      expect.arrayContaining(["src/cli.ts", "eslint.config.mjs"]),
    );
  });

  it("routes the function form the same way", () => {
    const config = defineConfig((base) => ({ ...base, entry: ["src/cli.ts"] }));

    expect(rootOf(config)?.entry).toContain("src/cli.ts");
    expect(config.entry).toBeUndefined();
  });

  it("moves `ignoreMembers`, which knip reads only from the workspace config", () => {
    expect(rootOf(defineConfig({ ignoreMembers: ["legacy"] }))?.ignoreMembers).toEqual(["legacy"]);
  });

  it("leaves the options knip falls back to globally at the top level", () => {
    // `ignoreExportsUsedInFile` and `includeEntryExports` are read as `workspace ?? top-level`, and
    // `ignore`/`ignoreFiles` are registered globally. Moving any of them under `"."` would turn a
    // default every workspace inherits into a root-only one.
    const config = defineConfig({
      ignore: ["fixtures/**"],
      ignoreExportsUsedInFile: true,
      includeEntryExports: true,
    });

    expect(config.ignore).toEqual(["fixtures/**"]);
    expect(config.ignoreExportsUsedInFile).toBe(true);
    expect(config.includeEntryExports).toBe(true);
    expect(rootOf(config)).not.toHaveProperty("ignore");
  });

  it("lets an explicit `workspaces['.']` win over the routed top-level value", () => {
    const config = defineConfig({
      paths: { "@/*": ["./src/*"] },
      workspaces: { ".": { paths: { "@/*": ["./lib/*"] } } },
    });

    expect((rootOf(config) as { paths: Record<string, string[]> }).paths).toEqual({
      "@/*": ["./lib/*"],
    });
  });
});

describe("workspaces", () => {
  it("merges the shared defaults into a workspace the caller configures", () => {
    // knip picks exactly one key per workspace — the most specific — and merges nothing into it,
    // so without this the managed-config entry points vanish from the one package that was tuned.
    const config = defineConfig({ workspaces: { "packages/a": { project: ["lib/**"] } } });

    expect(workspacesOf(config)["packages/a"]?.entry).toEqual(
      expect.arrayContaining(["eslint.config.mjs", "prettier.config.mjs"]),
    );
  });
});

describe("adopted groups", () => {
  it("reports everything knip reports on its own terms, by default", () => {
    // This config states the bar; a project declares its distance from it. A
    // default that withholds checks reads as a clean codebase.
    const rules = defineConfig().rules ?? {};

    for (const issueType of ["unlisted", "unresolved", "binaries", "duplicates"] as const) {
      expect(rules[issueType]).toBe("error");
    }
    for (const issueType of ["files", "exports", "types", "devDependencies"] as const) {
      expect(rules[issueType]).toBe("error");
    }

    // The two groups knip itself withholds, both left out for a stated cost:
    // `namespaces` asks for restructured imports rather than naming dead code,
    // and `cycles` cannot be enabled without an `include` that then defeats
    // every command-line filter.
    expect(rules.nsExports).toBe("off");
    expect(rules.nsTypes).toBe("off");
    expect(rules.cycles).toBe("off");
  });

  it("emits no `include` by default, which is what keeps CLI filters working", () => {
    // knip unions a config's `include` with the command line's, so any config
    // carrying one makes `--files` and friends stop narrowing. Reproduced
    // against knip 6.32.2: `--files` returned all fifteen reported types.
    expect(defineConfig().include).toBeUndefined();
  });

  it("narrows to the named groups and nothing else", () => {
    const rules = defineConfig(undefined, { adopted: ["correctness"] }).rules ?? {};

    expect(rules.unlisted).toBe("error");
    expect(rules.files).toBe("off");
    expect(rules.exports).toBe("off");
    expect(rules.devDependencies).toBe("off");
    expect(rules.cycles).toBe("off");
  });

  it("names the reported types in `include` once a project adopts one knip withholds", () => {
    // Severities feed knip's `exclude` and never its `include`, so `cycles` at
    // `error` reports nothing unless it is named — and naming it alone would
    // report nothing *but* cycles, so the list has to be every reported type.
    const config = defineConfig(undefined, {
      adopted: ["correctness", "cycles", "dependencies", "exports", "files"],
    });
    const include = config.include as string[];

    expect(include).toContain("cycles");
    expect(include).toEqual(expect.arrayContaining(["files", "exports", "unlisted"]));
    expect(include).not.toContain("nsExports");
  });

  it("leaves `include` alone when knip's own default set already covers the reported types", () => {
    // Nothing adopted here is one knip withholds, so imposing an `include`
    // would replace its default set for no reason.
    expect(defineConfig(undefined, { adopted: ["correctness", "files"] }).include).toBeUndefined();
  });

  it("keeps an `include` the caller wrote by hand", () => {
    const config = defineConfig({ include: ["files"] });

    expect(config.include).toEqual(["files"]);
  });

  it("refuses a per-type override knip would silently ignore", () => {
    // knip feeds every `off` type into `exclude`, and `exclude` containing
    // `dependencies` makes it add `devDependencies` and
    // `optionalPeerDependencies` there too — after which no `include` brings
    // them back. Reproduced against knip 6.32.2: an unused devDependency with
    // this exact config yields `{"issues":[]}` and exit 0.
    expect(() =>
      defineConfig({ rules: { devDependencies: "error" } }, { adopted: ["correctness"] }),
    ).toThrow(/dependencies.*is off/);

    expect(() =>
      defineConfig({ rules: { optionalPeerDependencies: "error" } }, { adopted: ["correctness"] }),
    ).toThrow();
  });

  it("follows knip when only `dependencies` is turned off, rather than refusing", () => {
    // The siblings sit at `error` because the adopted groups put them there, not
    // because anyone asked — so this is an ordinary override, and knip will turn
    // them off regardless. Emitting `error` would be a rule that reports nothing.
    for (const config of [
      defineConfig({ rules: { dependencies: "off" } }),
      defineConfig((base) => ({ ...base, rules: { ...base.rules, dependencies: "off" } })),
    ]) {
      const rules = config.rules!;

      expect(rules.dependencies).toBe("off");
      expect(rules.devDependencies).toBe("off");
      expect(rules.optionalPeerDependencies).toBe("off");
    }
  });

  it("still refuses when the caller names both halves of the contradiction", () => {
    expect(() =>
      defineConfig({ rules: { dependencies: "off", devDependencies: "error" } }),
    ).toThrow(/devDependencies/);
  });

  it("allows the same override once `dependencies` is on", () => {
    const rules = defineConfig(
      { rules: { dependencies: "error" } },
      { adopted: ["correctness"] },
    ).rules!;

    expect(rules.dependencies).toBe("error");
  });

  it("carries no Playwright block, so the plugin scopes test discovery itself", () => {
    // A blanket `*.test.*`/`*.spec.*` entry glob lived here to survive knip's
    // loader failing on a playwright.config that reaches JSX. It compensated for
    // a fixable defect in one project by widening every project's entry graph,
    // and it made the failure silent. The recipe is in the usage guide now.
    expect(defineConfig()).not.toHaveProperty("playwright");
  });

  it("lets a project add the fallback back for itself", () => {
    const config = defineConfig({
      playwright: { entry: ["**/*.@(spec|test).?(c|m)[jt]s?(x)"] },
    }) as { playwright: { entry: string[] } };

    // No `!`: an entry point in the default analysis only, so `--production`
    // still reports code that is alive only through a test.
    expect(config.playwright.entry).toEqual(["**/*.@(spec|test).?(c|m)[jt]s?(x)"]);
  });

  it("raises a `warn` a caller wrote, rather than keeping it", () => {
    // `KnipOverrides` narrows `rules` so this does not type-check — hence the
    // cast — but the canonical config file is a plain `.js` that nothing checks,
    // so the runtime guard has to hold on its own.
    //
    // knip's `warn` is real: the finding is reported and left out of the count
    // that sets the exit code. Under datamitsu it cannot be, because
    // `--reporter json` carries no severity — the finding would render as an
    // error while the tool exited zero.
    const overrides = { rules: { files: "warn" } } as unknown as Parameters<typeof defineConfig>[0];

    expect((defineConfig(overrides).rules ?? {}).files).toBe("error");
  });

  it("lets a per-type override re-enable an issue outside the adopted groups", () => {
    const rules =
      defineConfig({ rules: { cycles: "error" } }, { adopted: ["correctness"] }).rules ?? {};

    expect(rules.cycles).toBe("error");
    expect(rules.files).toBe("off");
  });
});

describe("tags", () => {
  it("excludes `@knipignore` at the top level, where knip reads it", () => {
    // `tags` is resolved as `args.tags ?? options.tags ?? parsedConfig.tags`, all of them
    // top-level — moving it under a workspace key would silently drop it.
    const config = defineConfig();

    expect(config.tags).toEqual(["-knipignore"]);
    expect(rootOf(config)).not.toHaveProperty("tags");
  });

  it("appends a caller's tag rather than replacing the base one", () => {
    expect(defineConfig({ tags: ["-legacy"] }).tags).toEqual(["-knipignore", "-legacy"]);
  });

  it("uses a tag name knip does not truncate", () => {
    // knip keeps the first `/[a-zA-Z]+/` match of the entry and discards the rest, so a
    // hyphenated name would resolve to its first word and quietly exclude the wrong tag.
    for (const tag of defineConfig().tags ?? []) {
      expect(tag.replace(/^-/, "")).toMatch(/^[a-zA-Z]+$/);
    }
  });
});

describe("merging", () => {
  it("appends to the base arrays instead of replacing them", () => {
    const config = defineConfig({ ignoreBinaries: ["custom"] });

    expect(config.ignoreBinaries).toEqual(
      expect.arrayContaining(["datamitsu", "dm", "s0", "custom"]),
    );
  });

  it("does not leak a caller's mutation into the next call", () => {
    // The function form hands `base` out; a caller pushing onto `base.entry` would otherwise
    // mutate the defaults every later call reads.
    defineConfig((base) => {
      (base.entry as string[]).push("leaked.ts");
      return base;
    });

    expect(rootOf(defineConfig())?.entry).not.toContain("leaked.ts");
  });
});
