import type { IgnoreId } from "./catalog";
import type { IgnoreEntry } from "./types";

import { catalog } from "./catalog";

/**
 * A consumer's ordered selection of catalog entries. `as` is that consumer's own spelling of the
 * entry, for when it writes the same path differently. Profiles in `profiles/` use the default
 * `IgnoreId`, so a mistyped or removed ID is a `tsc` error; the parameter exists for tests that
 * resolve against a catalog of their own.
 */
export type FlatProfile<Id extends string = IgnoreId> = {
  refs: Ref<Id>[];
  syntax: "glob" | "regex";
};
export type GitignoreProfile<Id extends string = IgnoreId> = {
  groups: Record<string, Ref<Id>[]>;
  syntax: "gitignore";
};
export type Profile<Id extends string = IgnoreId> = FlatProfile<Id> | GitignoreProfile<Id>;
export type Ref<Id extends string = IgnoreId> = Id | { as: string; id: Id };

export function resolve<Id extends string = IgnoreId>(
  profile: GitignoreProfile<Id>,
  entries?: Readonly<Record<string, IgnoreEntry>>,
): Record<string, string[]>;
export function resolve<Id extends string = IgnoreId>(
  profile: FlatProfile<Id>,
  entries?: Readonly<Record<string, IgnoreEntry>>,
): string[];
export function resolve<Id extends string = IgnoreId>(
  profile: Profile<Id>,
  entries: Readonly<Record<string, IgnoreEntry>> = catalog,
): Record<string, string[]> | string[] {
  // Own entries only, so an inherited name such as `toString` is an unknown ID, not a lookup.
  const byId = new Map(Object.entries(entries));

  const resolveRef = (ref: Ref<Id>): string => {
    const id = typeof ref === "string" ? ref : ref.id;
    const entry = byId.get(id);
    if (!entry) {
      throw new Error(`Unknown ignore ID: ${id}`);
    }
    if (entry.negate && profile.syntax !== "gitignore") {
      throw new Error(`Negated ignore entry ${id} cannot be used in ${profile.syntax}`);
    }
    const spelling =
      typeof ref === "string"
        ? entry[profile.syntax === "gitignore" ? "git" : profile.syntax]
        : ref.as;
    if (spelling === undefined) {
      throw new Error(`Missing ${profile.syntax} spelling for ignore entry ${id}`);
    }
    return entry.negate ? `!${spelling}` : spelling;
  };

  if (profile.syntax === "gitignore") {
    return Object.fromEntries(
      Object.entries(profile.groups).map(([group, refs]) => [group, refs.map(resolveRef)]),
    );
  }
  return profile.refs.map(resolveRef);
}
