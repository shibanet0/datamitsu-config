import { describe, expect, it } from "vitest";

import {
  disabledRuleNames,
  disabledRulesForESLint,
  disabledRulesForOxlint,
  PERMANENTLY_DISABLED_RULES,
  TEMPORARILY_DISABLED_RULES,
  toOxlintRuleName,
} from "..";
import { OXLINT_KNOWN_RULES } from "../oxlint-known-rules.generated";

describe("disabled rule lists", () => {
  it("keeps the two lists disjoint", () => {
    const overlap = Object.keys(TEMPORARILY_DISABLED_RULES).filter(
      (name) => name in PERMANENTLY_DISABLED_RULES,
    );

    expect(overlap).toEqual([]);
  });

  it("gives every rule a reason", () => {
    const unexplained = [
      ...Object.entries(PERMANENTLY_DISABLED_RULES),
      ...Object.entries(TEMPORARILY_DISABLED_RULES),
    ]
      .filter(([, reason]) => reason.trim() === "")
      .map(([name]) => name);

    expect(unexplained).toEqual([]);
  });

  it("writes rules in the ESLint spelling, not oxlint's", () => {
    const oxlintSpellings = disabledRuleNames().filter((name) =>
      ["import/", "jsx-a11y/", "typescript/"].some((prefix) => name.startsWith(prefix)),
    );

    expect(oxlintSpellings).toEqual([]);
  });
});

describe("disabledRuleNames", () => {
  it("drops the migration backlog when temporary rules are opted out of", () => {
    expect(disabledRuleNames({ temporary: false })).toEqual(
      Object.keys(PERMANENTLY_DISABLED_RULES),
    );
  });

  it("applies the migration backlog by default", () => {
    expect(disabledRuleNames().length).toBe(
      Object.keys(PERMANENTLY_DISABLED_RULES).length +
        Object.keys(TEMPORARILY_DISABLED_RULES).length,
    );
  });
});

describe("disabledRulesForESLint", () => {
  it("turns every rule off", () => {
    const severities = new Set(Object.values(disabledRulesForESLint()));

    expect([...severities]).toEqual(["off"]);
  });

  it("also silences the plugin that re-publishes a core rule", () => {
    const rules = disabledRulesForESLint();

    expect(rules["max-params"]).toBe("off");
    expect(rules["@typescript-eslint/max-params"]).toBe("off");
  });

  it("passes oxlint-only names straight through — ESLint ignores unknown rules at off", () => {
    expect(disabledRulesForESLint()["oxc/no-async-await"]).toBe("off");
  });
});

describe("disabledRulesForOxlint", () => {
  it("emits only names the pinned oxlint build knows", () => {
    const unknown = Object.keys(disabledRulesForOxlint()).filter(
      (name) => !OXLINT_KNOWN_RULES.includes(name),
    );

    expect(unknown).toEqual([]);
  });

  it("rewrites the prefixes oxlint spells differently", () => {
    expect(toOxlintRuleName("@typescript-eslint/no-explicit-any")).toBe(
      "typescript/no-explicit-any",
    );
    expect(toOxlintRuleName("import-x/no-duplicates")).toBe("import/no-duplicates");
    expect(toOxlintRuleName("jsx-a11y-x/alt-text")).toBe("jsx-a11y/alt-text");
    expect(toOxlintRuleName("unicorn/no-null")).toBe("unicorn/no-null");
  });

  it("drops the ESLint-only plugins rather than failing oxlint's config parse", () => {
    const rules = disabledRulesForOxlint();

    expect(rules["sonarjs/no-unused-vars"]).toBeUndefined();
    expect(rules["perfectionist/sort-objects"]).toBeUndefined();
    expect(rules["typescript/no-explicit-any"]).toBe("off");
  });
});
