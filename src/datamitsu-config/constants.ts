export const runtimeVersions = {
  node: "26.3.0",
  python: "3.14.5",
};

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
