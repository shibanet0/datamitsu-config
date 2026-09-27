import { describe, expect, it } from "vitest";

import {
  APP_CATEGORIES,
  type AppInfo,
  categorizeApps,
  generateMarkdownTable,
} from "../generate-docs-apps.ts";

const app = (name: string): AppInfo => ({
  description: undefined,
  name,
  repository: undefined,
  runtime: "binary",
});

const categoryMap = {
  "Linters & Formatters": ["eslint", "oxfmt"],
  "Security Scanners": ["gitleaks"],
  Utilities: ["jq"],
};

describe("categorizeApps", () => {
  it("groups every app under its category, in the table's order", () => {
    const categories = categorizeApps(
      [app("jq"), app("oxfmt"), app("gitleaks"), app("eslint")],
      categoryMap,
    );

    expect([...categories.keys()]).toEqual([
      "Linters & Formatters",
      "Security Scanners",
      "Utilities",
    ]);
    expect(categories.get("Linters & Formatters")?.map((a) => a.name)).toEqual(["oxfmt", "eslint"]);
  });

  it("refuses an app with no category instead of filing it under Utilities", () => {
    expect(() =>
      categorizeApps(
        [app("eslint"), app("oxfmt"), app("gitleaks"), app("jq"), app("stylelint")],
        categoryMap,
      ),
    ).toThrow("apps with no category: stylelint");
  });

  it("refuses a category entry that is no longer an app", () => {
    expect(() =>
      categorizeApps([app("eslint"), app("oxfmt"), app("gitleaks")], categoryMap),
    ).toThrow("categorized names that are no longer apps: jq");
  });

  it("refuses an app listed under two categories", () => {
    expect(() =>
      categorizeApps([app("eslint"), app("oxfmt"), app("gitleaks"), app("jq")], {
        ...categoryMap,
        Utilities: ["jq", "eslint"],
      }),
    ).toThrow("apps listed twice: eslint (Linters & Formatters, Utilities)");
  });

  it("lists every name in the real table exactly once", () => {
    const names = Object.values(APP_CATEGORIES).flat();

    expect(new Set(names).size).toBe(names.length);
  });
});

describe("generateMarkdownTable", () => {
  it("gives every app its category in a column of its own", () => {
    const apps = [app("eslint"), app("gitleaks"), app("jq"), app("oxfmt")];
    const table = generateMarkdownTable(apps, categorizeApps(apps, categoryMap)).split("\n");

    expect(table[0]).toBe("| App | Category | Runtime | Info | Description |");
    expect(table.find((line) => line.startsWith("| gitleaks |"))).toMatch(
      /^\| gitleaks \| Security Scanners \| binary \|/,
    );
    expect(table.find((line) => line.startsWith("| oxfmt |"))).toMatch(
      /^\| oxfmt \| Linters & Formatters \| binary \|/,
    );
  });
});
