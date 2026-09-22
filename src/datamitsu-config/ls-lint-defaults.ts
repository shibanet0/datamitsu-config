import { resolve } from "../ignore/profile";
import { lsLintProfile } from "../ignore/profiles/ls-lint";

/**
 * How deep a catalog directory may sit and still be skipped by the managed base.
 *
 * Ls-lint (v2.3.1) expands every `ignore` entry holding `*`, `{` or `}` with a glob over the whole
 * tree before it starts walking, and does not prune while expanding
 * (https://github.com/loeffel-io/ls-lint/issues/246). A single `**` entry therefore reads all of
 * `node_modules`: over 7 minutes on a pnpm monorepo with ~3.6k packages. A fixed-depth `*` only
 * lists the levels it names — 0.2s at depth 2, 1.5s at 3, 3.2s at 4, 18.8s at 6 on the same tree.
 * Depth 3 reaches `packages/<name>/src/generated`; a project with deeper directories lists them in
 * its own `.ls-lint.yml` as literal paths, which cost nothing because ls-lint matches them as path
 * prefixes during the walk.
 */
export const LS_LINT_IGNORE_DEPTH = 3;

/**
 * Every `**`-rooted pattern rewritten as one brace group per depth, 0 through `depth`; the rest are
 * left as they are. An alternative holding `,`, `{` or `}` would split or close the group and
 * silently change what is ignored, so it throws instead.
 */
export function expandToDepth(patterns: string[], depth: number): string[] {
  const prefix = "**/";
  const names = patterns
    .filter((pattern) => pattern.startsWith(prefix))
    .map((pattern) => pattern.slice(prefix.length));
  const rest = patterns.filter((pattern) => !pattern.startsWith(prefix));

  const unsafe = names.find((name) => /[,{}]/u.test(name));
  if (unsafe !== undefined) {
    throw new Error(
      `ls-lint ignore pattern ${JSON.stringify(prefix + unsafe)} cannot be merged into a brace group`,
    );
  }
  if (names.length === 0) {
    return rest;
  }

  const group = names.length === 1 ? names[0]! : `{${names.join(",")}}`;
  const levels = Array.from({ length: depth + 1 }, (_, level) => "*/".repeat(level) + group);
  return [...levels, ...rest];
}

// File names are alint's; ls-lint only checks directories. The rule is permissive on purpose:
// front-end trees name component directories in PascalCase and camelCase, framework routers need
// `[slug]`, `(group)` and `@slot`, and Playwright names its screenshot directories after the test
// file (`index.test.ts-snapshots`). A project narrows it in its own `.ls-lint.yml`.
const directoryRule = [
  "kebab-case",
  "snake_case",
  "camelCase",
  "PascalCase",
  // Dot-directories, including tool caches such as .mypy_cache and .ruff_cache.
  String.raw`regex:\.[a-z0-9_-]+`,
  "regex:__[a-z0-9]+__",
  String.raw`regex:\[{1,2}(\.\.\.)?[a-zA-Z0-9-]+\]{1,2}`,
  // Route groups and optional segments: (marketing), ($lang), {-$locale}; TanStack $postId, $.
  String.raw`regex:\(\$?[a-zA-Z0-9-]+\)`,
  String.raw`regex:\{-?\$[a-zA-Z0-9]+\}`,
  String.raw`regex:\$[a-zA-Z0-9]*`,
  "regex:@[a-z0-9-]+",
  "regex:[a-zA-Z0-9._-]+-snapshots",
  // Next.js intercepting routes: (.)photo, (..)photo, (..)(..)photo, (...)photo.
  String.raw`regex:(\(\.{1,3}\))+[a-zA-Z0-9\[\]._-]+`,
].join(" | ");

export function buildManagedLsLintYaml(): string {
  return YAML.stringify({
    ignore: expandToDepth(resolve(lsLintProfile), LS_LINT_IGNORE_DEPTH),
    ls: { ".dir": directoryRule },
  });
}
