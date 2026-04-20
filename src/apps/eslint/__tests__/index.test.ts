import { describe, expect, it } from "vitest";

import { defineConfig } from "../index";

function getConfigNames(items: { name?: string }[]): string[] {
  return items.filter((item) => item.name).map((item) => item.name as string);
}

describe("defineConfig plugin registry", () => {
  it("loads base plugins (javascript, typescript) with empty package.json", async () => {
    const items = (await defineConfig({}, [])) as unknown as { name?: string }[];
    const names = getConfigNames(items);
    expect(names.some((n) => n.includes("shibanet0/js"))).toBe(true);
    expect(names.some((n) => n.includes("shibanet0/typescript"))).toBe(true);
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
