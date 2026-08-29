export const runtimeVersions = {
  node: "26.8.1",
  python: "3.14.7",
};

// Consumer-facing support floor for `engines.node` — the lowest Node we promise
// to run on, NOT the dev version (that is runtimeVersions.node / .node-version).
// 22.12.0 is where require(esm) became unflagged.
export const NODE_SUPPORT_FLOOR = ">=22.12.0";

interface IndentSetting {
  indentWidth: number;
  lineWidth: number;
}

/**
 * Indent width and line width shared across every formatter (prettier, oxfmt, ruff, typstyle, …).
 * Single source of truth — reference it instead of hardcoding the values per tool so every
 * formatter stays in lockstep.
 */
export const indentSettings: IndentSetting = {
  indentWidth: 2,
  lineWidth: 100,
};

/**
 * Formatter override that pins strict JSON to the fully expanded, one-entry-per-line shape — byte
 * for byte what `JSON.stringify(value, null, 2)` produces.
 *
 * Every other writer in the `fix` pipeline already emits that shape: `yq -o json` (the `yq-json`
 * key sorter), the `datamitsu init` config generators and `sort-package-json`. prettier and oxfmt,
 * left alone, collapse whatever fits on one line instead, so a JSON file kept flip-flopping between
 * the two forms across `fix` and `lint` runs. Forcing the print width to 1 means nothing ever fits,
 * which settles the whole pipeline on the single expanded form.
 *
 * A print width — rather than prettier's `parser: "json-stringify"`, which does the same thing more
 * directly — because oxfmt has no `parser` option, and oxfmt runs last in the fix order and is the
 * formatter this config is converging on. 1 rather than 0 because oxfmt rejects widths below 1.
 *
 * `.jsonc`/`.json5` are deliberately excluded: yq skips them, so they have nothing to reconcile,
 * and expanding them would append a trailing comma to every entry.
 *
 * Applied by both src/apps/prettier/index.ts and src/apps/oxfmt/index.ts — they must stay in sync,
 * otherwise the later formatter undoes the earlier one.
 */
export const jsonAlwaysExpandedOverride = {
  files: ["*.json"],
  options: { printWidth: 1 },
};
