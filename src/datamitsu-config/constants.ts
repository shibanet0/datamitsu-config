export const runtimeVersions = {
  node: "26.5.0",
  python: "3.14.6",
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
