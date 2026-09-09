import { describe, expect, it } from "vitest";

import { defineConfig, oxlintConfig, oxlintConfigFor } from "..";

const REACT = { dependencies: { react: "19.0.0", "react-dom": "19.0.0" } };
const NEXT = { dependencies: { next: "16.0.0", react: "19.0.0" } };
const NODE = { dependencies: { fastify: "5.0.0" } };

describe("conditional plugins", () => {
  it("drops a framework plugin the project does not depend on", () => {
    // The failure this exists for: `nextjs` used to be on everywhere, so a package with no Next.js
    // in its tree failed on `next/no-img-element` for an `<img>` in a plain React component.
    expect(oxlintConfigFor(REACT).plugins).not.toContain("nextjs");
    expect(oxlintConfigFor(NEXT).plugins).toContain("nextjs");
  });

  it("keeps the plugins that apply to any JavaScript", () => {
    const plugins = oxlintConfigFor(NODE).plugins as string[];

    expect(plugins).toEqual(
      expect.arrayContaining(["eslint", "import", "oxc", "typescript", "unicorn"]),
    );
    expect(plugins).not.toEqual(expect.arrayContaining(["react", "vue", "vitest"]));
  });

  it("keeps every plugin when there is no manifest to consult", () => {
    // A consumer whose oxlint.config.mts predates the parameter must not silently lose rules.
    expect(oxlintConfigFor().plugins).toEqual(oxlintConfig.plugins);
  });
});

describe("temporaryRules opt-out", () => {
  it("drops the backlog and keeps the permanent decisions", () => {
    const withBacklog = Object.keys(oxlintConfigFor(REACT).rules ?? {}).length;
    const without = oxlintConfigFor(REACT, { temporaryRules: false });

    expect(Object.keys(without.rules ?? {}).length).toBeLessThan(withBacklog);
    expect(without.rules?.["unicorn/no-null"]).toBe("off");
  });
});

describe("defineConfig", () => {
  it("adds a caller's rules instead of replacing the shared list", () => {
    // `{ ...base, ...config }` took the config from ~330 turn-offs to one, which measured 3989
    // errors on this repository — including two rules that cannot both be satisfied.
    const base = defineConfig(REACT);
    const merged = defineConfig(REACT, { rules: { "no-console": "off" } });

    expect(Object.keys(merged.rules ?? {}).length).toBe(Object.keys(base.rules ?? {}).length);
    expect(merged.rules?.["unicorn/no-null"]).toBe("off");
    expect(merged.rules?.["eqeqeq"]).toEqual(["error", "always", { null: "ignore" }]);
  });

  it("appends to array fields rather than replacing them", () => {
    const merged = defineConfig(REACT, { ignorePatterns: ["custom/**"] });

    expect(merged.ignorePatterns).toContain("custom/**");
    expect(merged.ignorePatterns?.length).toBeGreaterThan(
      (oxlintConfig.ignorePatterns ?? []).length,
    );
  });

  it("still lets the function form replace the base outright", () => {
    const replaced = defineConfig(REACT, (base) => ({ ...base, rules: { "no-console": "off" } }));

    expect(Object.keys(replaced.rules ?? {})).toEqual(["no-console"]);
  });
});

describe("vitest scoping", () => {
  it("takes the vitest rules away from everything that is not a test file", () => {
    // oxlint's vitest plugin carries no file scope of its own, so enabling it told `scripts/*.ts`
    // to import globals from vitest. Expressed as "everything except the tests" because an
    // override can only add to what the categories already switched on.
    const scoped = (oxlintConfigFor(REACT).overrides ?? []).find(
      (override) => override.excludeFiles !== undefined,
    );

    expect(scoped?.excludeFiles).toContain("**/__tests__/**");
    expect(Object.keys(scoped?.rules ?? {}).length).toBeGreaterThan(50);
    expect(Object.keys(scoped?.rules ?? {}).every((name) => name.startsWith("vitest/"))).toBe(true);
  });
});
