import { describe, expect, it } from "vitest";

import { defineConfig } from "../index";
import { oxlint } from "../plugins/oxlint";

function getConfigNames(items: { name?: string }[]): string[] {
  return items.filter((item) => item.name).map((item) => item.name as string);
}

describe("defineConfig plugin registry", () => {
  it("loads base plugins (javascript, typescript) with empty package.json", async () => {
    const items = (await defineConfig({}, [])) as unknown as { name?: string }[];
    const names = getConfigNames(items);
    expect(names.some((n) => n.includes("s0/js"))).toBe(true);
    expect(names.some((n) => n.includes("s0/typescript"))).toBe(true);
  });

  it("respects disabled flag on a plugin", async () => {
    const withUnicorn = (await defineConfig({}, [])) as unknown as { name?: string }[];
    const withoutUnicorn = (await defineConfig({}, [], {
      plugins: { unicorn: { disabled: true } },
    })) as unknown as { name?: string }[];
    const namesWith = getConfigNames(withUnicorn);
    const namesWithout = getConfigNames(withoutUnicorn);
    expect(namesWith.some((n) => n.includes("unicorn"))).toBe(true);
    expect(namesWithout.some((n) => n.includes("unicorn"))).toBe(false);
  });

  it("enables react plugins when react dependency is present", async () => {
    const items = (await defineConfig({ dependencies: { react: "^19.0.0" } }, [])) as unknown as {
      name?: string;
    }[];
    const names = getConfigNames(items);
    expect(names.some((n) => n.includes("react"))).toBe(true);
  });

  it("skips react plugins when react option is false", async () => {
    const items = (await defineConfig({ dependencies: { react: "^19.0.0" } }, [], {
      react: false,
    })) as unknown as { name?: string }[];
    const names = getConfigNames(items);
    expect(names.some((n) => n.includes("react"))).toBe(false);
  });

  it("skips conditional plugins when dependency is missing", async () => {
    const items = (await defineConfig({}, [])) as unknown as { name?: string }[];
    const names = getConfigNames(items);
    expect(names.some((n) => n.includes("playwright"))).toBe(false);
  });

  it("enables conditional plugins when dependencies are present", async () => {
    const withoutDeps = (await defineConfig({}, [])) as unknown as { name?: string }[];
    const withDeps = (await defineConfig(
      {
        dependencies: {
          clsx: "^2.0.0",
          i18next: "^23.0.0",
          playwright: "^1.0.0",
          vitest: "^2.0.0",
        },
      },
      [],
    )) as unknown as { name?: string }[];
    expect(withDeps.length).toBeGreaterThan(withoutDeps.length);
  });

  it("enables storybook plugin when storybook dependency and react are present", async () => {
    const withoutStorybook = (await defineConfig(
      { dependencies: { react: "^19.0.0" } },
      [],
    )) as unknown as { name?: string }[];
    const withStorybook = (await defineConfig(
      {
        dependencies: {
          react: "^19.0.0",
          storybook: "^8.0.0",
        },
      },
      [],
    )) as unknown as { name?: string }[];
    expect(withStorybook.length).toBeGreaterThan(withoutStorybook.length);
  });
});

describe("oxlint React Hooks handoff", () => {
  it("does not suppress an explicitly disabled React Compiler rule", async () => {
    const items = await oxlint(
      undefined,
      { temporaryRules: false },
      {
        categories: { correctness: "error" },
        plugins: ["react"],
        rules: { "react/purity": "off" },
      },
    );

    expect(items.every((item) => item.rules?.["react-hooks/purity"] === undefined)).toBe(true);
    expect(items.some((item) => item.rules?.["react-hooks/immutability"] === "off")).toBe(true);
  });

  it("does not suppress React Refresh when its oxlint rule is off", async () => {
    const items = await oxlint(undefined, undefined, {
      categories: { restriction: "error" },
      plugins: ["react"],
      rules: { "react/only-export-components": "off" },
    });

    expect(
      items.every((item) => item.rules?.["react-refresh/only-export-components"] === undefined),
    ).toBe(true);
  });

  it("retains upstream Hooks suppressions only on files oxlint reads", async () => {
    const items = await oxlint(undefined, undefined, {
      categories: { correctness: "error" },
      plugins: ["react"],
      rules: { "react/purity": "error" },
    });
    const suppression = items.find((item) => item.rules?.["react-hooks/purity"] === "off");

    expect(suppression).toBeDefined();
    expect(suppression?.files).toBeDefined();
    expect(items.every((item) => item.rules?.["react/purity"] === undefined)).toBe(true);
  });
});
