import { resolve } from "../ignore/profile";
import { eslintProfile } from "../ignore/profiles/eslint";

/**
 * What counts as a test file, in the shape oxlint's `overrides` matcher takes.
 *
 * The ESLint half scopes its vitest block with `GLOB_TESTS` in `src/apps/eslint/globs.ts`, which
 * spells the same idea with an explicit extension list because it is used as flat config `files`.
 * These two have to keep saying the same thing: a rule that is a test rule on one side and a
 * general rule on the other is the asymmetry `src/lint-rules` exists to prevent.
 *
 * Extensions are left off here deliberately — oxlint only ever hands its matcher files it already
 * decided to lint, so qualifying them would add a second place to remember a new extension.
 */
export const GLOB_TESTS_OXLINT = ["**/__tests__/**", "**/*.test.*", "**/*.spec.*"];

/**
 * The one list of paths no linter should look at.
 *
 * It lives outside `src/apps/*` because both halves read it: ESLint takes it verbatim through
 * `globalIgnores`, and oxlint gets it translated by {@link toOxlintIgnorePatterns}. Before that the
 * ESLint half had this list and oxlint's `ignorePatterns` was empty — invisible under `dm lint`,
 * which passes an explicit file list, and very visible in an editor, where the oxlint LSP would
 * happily lint `dist/` and `generated/`.
 */
export const GLOB_EXCLUDE = resolve(eslintProfile);

/**
 * The same list in the shape oxlint accepts.
 *
 * Oxlint matches gitignore-style rather than minimatch, and its glob engine has no extglob: a
 * pattern like `auto-import?(s).d.ts` is a hard error that rejects the whole config file, not a
 * pattern that fails to match. The two forms this list uses are expanded here instead.
 */
export function toOxlintIgnorePatterns(patterns: string[]): string[] {
  return patterns.flatMap((pattern) => expandExtglobs(pattern));
}

/**
 * Every extglob in a pattern, expanded to the set of plain patterns it stands for.
 *
 * Recursive rather than a single `exec`, because a pattern can hold more than one and expanding the
 * first leaves the rest in place — where oxlint's glob engine reads them as literal characters and
 * the pattern quietly matches nothing.
 *
 * Only `?(…)` (zero or one, so the empty alternative is part of the expansion) and `@(…)` (exactly
 * one) are expanded. `*(…)` and `+(…)` repeat, and `!(…)` negates; none of them is a finite list of
 * alternatives. They throw rather than silently emitting a pattern that means something else: this
 * runs at build time, so a pattern that cannot be expanded is a failed build here instead of a
 * directory that stops being ignored in every consumer.
 */
function expandExtglobs(pattern: string): string[] {
  const unsupported = /[!*+]\([^()]*\)/u.exec(pattern);

  if (unsupported) {
    throw new Error(
      `GLOB_EXCLUDE pattern ${JSON.stringify(pattern)} uses the extglob ${JSON.stringify(unsupported[0])}, ` +
        "which has no gitignore-style equivalent and cannot be handed to oxlint.",
    );
  }

  const extglob = /(?<quantifier>[?@])\((?<inner>[^()]*)\)/u.exec(pattern);
  const inner = extglob?.groups?.["inner"];
  const quantifier = extglob?.groups?.["quantifier"];

  if (!extglob || inner === undefined || quantifier === undefined) {
    return [pattern];
  }

  const alternatives = inner.split("|");
  const expansions = quantifier === "?" ? ["", ...alternatives] : alternatives;

  return expansions.flatMap((alternative) =>
    expandExtglobs(pattern.replace(extglob[0], alternative)),
  );
}
