/**
 * One ignore entry in the shared catalog, keyed by its stable ID in `catalog.ts`.
 *
 * Each syntax is spelled explicitly rather than derived: gitignore and glob anchoring differ (a
 * bare `.env` in gitignore is not root-anchored the way a glob is), so an entry states every
 * spelling it is used with. `kind` is metadata — it says why a path is skipped and is never used to
 * select.
 */
export type IgnoreEntry = {
  // Every field is required, `undefined` when absent, so every row of the catalog table has the
  // same columns and they line up.
  git: string | undefined;
  glob: string | undefined;
  kind: IgnoreKind;
  negate: boolean;
  note: string | undefined;
  regex: string | undefined;
};

export type IgnoreKind =
  | "build"
  | "cache"
  | "dependency"
  | "editor"
  | "encrypted"
  | "fixture"
  | "generated"
  | "lockfile"
  | "log"
  | "metadata"
  | "release"
  | "secret"
  | "vendored";
