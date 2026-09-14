/**
 * The one list of paths no linter should look at.
 *
 * It lives outside `src/apps/*` because both halves read it: ESLint takes it verbatim through
 * `globalIgnores`, and oxlint gets it translated by {@link toOxlintIgnorePatterns}. Before that the
 * ESLint half had this list and oxlint's `ignorePatterns` was empty — invisible under `dm lint`,
 * which passes an explicit file list, and very visible in an editor, where the oxlint LSP would
 * happily lint `dist/` and `generated/`.
 */
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

export const GLOB_EXCLUDE = [
  "**/node_modules",
  "**/dist",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/pnpm-lock.yaml",
  "**/bun.lockb",
  "**/generated/**",
  "**/output",
  "**/coverage",
  "**/temp",
  "**/.temp",
  "**/tmp",
  "**/build",
  "**/.tmp",
  "**/.history",
  "**/.vitepress/cache",
  "**/.nuxt",
  "**/.turbo/**",
  "**/playwright-report-html/**",
  "**/playwright-report-allure/**",
  "**/playwright-report-*/**",
  "**/.git/**",
  "**/.next",
  "**/out/**",
  "**/storybook-static/**",
  "**/.svelte-kit",
  "**/.vercel",
  "**/.changeset",
  "**/.idea",
  "**/.cache",
  "**/.output",
  "**/.vite-inspect",
  "**/.yarn",
  "**/vite.config.*.timestamp-*",

  "**/CHANGELOG*.md",
  "**/*.min.*",
  "**/LICENSE*",
  "**/__snapshots__",
  "**/auto-import?(s).d.ts",
  "**/components.d.ts",

  "**/.datamitsu",

  "**/*.json.enc",
  "**/*.yaml.enc",
  "**/*.yml.enc",
];

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
 * `!(…)` is negation, which no list of alternatives can express. It throws rather than silently
 * emitting a pattern that means something else: this runs at build time, so a pattern that cannot
 * be expanded is a failed build here instead of a directory that stops being ignored in every
 * consumer.
 */
function expandExtglobs(pattern: string): string[] {
  const negated = /!\([^()]*\)/u.exec(pattern);

  if (negated) {
    throw new Error(
      `GLOB_EXCLUDE pattern ${JSON.stringify(pattern)} uses the extglob ${JSON.stringify(negated[0])}, ` +
        "which has no gitignore-style equivalent and cannot be handed to oxlint.",
    );
  }

  // `?(a)` and `*(a)` are "zero or more", so the empty alternative is part of the expansion;
  // `@(a)` and `+(a)` are "exactly one" and "one or more", so it is not.
  const extglob = /(?<quantifier>[?*@+])\((?<inner>[^()]*)\)/u.exec(pattern);
  const inner = extglob?.groups?.["inner"];
  const quantifier = extglob?.groups?.["quantifier"];

  if (!extglob || inner === undefined || quantifier === undefined) {
    return [pattern];
  }

  const alternatives = inner.split("|");
  const expansions =
    quantifier === "?" || quantifier === "*" ? ["", ...alternatives] : alternatives;

  return expansions.flatMap((alternative) =>
    expandExtglobs(pattern.replace(extglob[0], alternative)),
  );
}
