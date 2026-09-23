export const GLOB_SRC_EXT = "?([cm])[jt]s?(x)";
export const GLOB_SRC = "**/*.?([cm])[jt]s?(x)";

export const GLOB_JS = "**/*.?([cm])js";
export const GLOB_JSX = "**/*.?([cm])jsx";

export const GLOB_TS = "**/*.?([cm])ts";
export const GLOB_TSX = "**/*.?([cm])tsx";

export const GLOB_STYLE = "**/*.{c,le,sc}ss";
export const GLOB_CSS = "**/*.css";
export const GLOB_POSTCSS = "**/*.{p,post}css";
export const GLOB_LESS = "**/*.less";
export const GLOB_SCSS = "**/*.scss";

/**
 * Where test files live, for the plugins whose rules only make sense inside one.
 *
 * Both of the plugins that need this were mis-scoped. The vitest block asked for `tests/**`, which
 * matches nothing in a repository whose tests are in `__tests__/` — so its rules had never run at
 * all. eslint-plugin-playwright's `flat/recommended` carries no `files` of its own, so its 37 rules
 * applied to every file in any project that has playwright installed.
 *
 * One list rather than two per plugin, because "is this a test file" is one question. The e2e set
 * is separate only because playwright's default `testDir` is a directory rather than a filename
 * convention.
 */
export const GLOB_TESTS = [
  `**/__tests__/**/*.${GLOB_SRC_EXT}`,
  `**/*.spec.${GLOB_SRC_EXT}`,
  `**/*.test.${GLOB_SRC_EXT}`,
];

/**
 * Where playwright specs live. Directory-shaped, because playwright scopes by `testDir` rather than
 * by filename — which is also why this is a separate list from {@link GLOB_TESTS}.
 *
 * `**\/tests/**` is deliberately not here. It is the conventional home of _unit_ tests in plenty of
 * projects, and matching it applied all 37 playwright rules to them: `no-conditional-in-test`,
 * `no-conditional-expect`, `no-focused-test`, `prefer-to-have-length` on a vitest file, two of them
 * duplicating a sonarjs finding on the same line. A project that keeps e2e specs somewhere else
 * names the directory itself; that is a smaller cost than arming the rules everywhere.
 */
export const GLOB_E2E = [
  `**/e2e/**/*.${GLOB_SRC_EXT}`,
  `**/playwright/**/*.${GLOB_SRC_EXT}`,
  `**/*.e2e.${GLOB_SRC_EXT}`,
  `**/playwright.config.${GLOB_SRC_EXT}`,
];

export const GLOB_HTML = "**/*.html";

export const GLOB_SVELTE = "**/*.svelte";

/**
 * Svelte 5's rune modules — plain JS/TS that may use `$state` and friends, which
 * `svelte-eslint-parser` has to see to resolve them.
 *
 * Kept separate from {@link GLOB_SVELTE} because these files are also matched by `GLOB_SRC`: the
 * TypeScript block reaches them too, and the svelte parser is attached on top rather than instead.
 */
export const GLOB_SVELTE_SCRIPT = ["**/*.svelte.js", "**/*.svelte.ts"];

export const GLOB_JSON = "**/*.json";
export const GLOB_JSON5 = "**/*.json5";
export const GLOB_JSONC = "**/*.jsonc";
export const GLOB_TOML = "**/*.toml";
export const GLOB_YAML = "**/*.{yaml,yml}";

export const GLOB_ALL_SRC = [
  GLOB_SRC,
  GLOB_STYLE,
  GLOB_JSON,
  GLOB_JSON5,
  // GLOB_MARKDOWN,
  // GLOB_SVELTE,
  // GLOB_VUE,
  // GLOB_YAML,
  // GLOB_XML,
  // GLOB_HTML,
];

export { GLOB_EXCLUDE } from "../../globs/globs";
