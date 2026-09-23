import { data as archiveSortKeys } from "../inline-config/sort-keys";
import nodeVersions from "../registries/nodeVersions.json";

/**
 * Alphabetical key order for YAML and `.properties`, replacing the two `yq` invocations that did
 * the same job and lost data doing it:
 *
 * - YAML. `sort_keys(..)` moved an alias above the anchor that defines it, and the document stopped
 *   parsing. This one leaves any document carrying an anchor, an alias or a merge key exactly as it
 *   is, and sorts the rest.
 * - `.properties`. The round trip through YAML folded `a.b` into a nested `a` and dropped one of the
 *   two keys. This one never parses values — it orders whole records as text.
 *
 * One app with the format as its first argument, rather than one app per format: the two sorters
 * are fifty lines each and share their whole contract (idempotent, byte-stable,
 * comment-preserving), so splitting them would duplicate the packaging and the tests without
 * separating anything.
 *
 * The inline entrypoint resolves its external YAML parser from the managed app environment, the
 * same way lefthook-sort does — the YAML side has to go through the `yaml` document AST, because
 * that is what keeps every comment attached to the key it belongs to.
 */
export const sortKeysApp: BinManager.App = {
  archives: {
    main: {
      inline: archiveSortKeys,
    },
  },
  bun: {
    binPath: "index.mjs",
    ...nodeVersions.yaml,
    lockFile:
      "br:G6EBIBwHdqyxIP/ilUkIXTUwz75URFwNQoMozPVtEBe0vIPn1OdU8Yikwh9T6AhXveqZOBwXpFk7+4xhQbDpzKyjApQJCiyUXgmC7B2ttVoub/fvLhqAQkODxVJafO3IyvCYw0IgD4HL210pSsglGefb5X1yx6fHwzAhLeR0UzCETFBrjBrvdmFTKgVjWI2CXQR4Kf4Fmv5n+/gq7pspTzM4Y782xYg9zqTfQph8xbjoHu3lQAc0Hw2F4em6o+634WGfZvPL+ECu8zhPtt9neGXSZcyMg09f7RYHB2WzOU3dl3n2yLi5resHkK6XK/7R9KUADR3NEQK4Y7Pp3dmetJzaaXo5cs9UIIB/AA==",
  },
  description: "Alphabetical key sorter for YAML and .properties files",
};
