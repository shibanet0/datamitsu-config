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
      "br:G6EBIBwHdjtOkFuxyiSE51NDdtt/WiSVN/rKDaIw17dBXNDyDp5Tn1PFI5IKf0yhI1z1uk3w6LiqGG7maYkFwa4zt44aWKUYuFB6LQiyd7TWZrW6g+8uGohGQ4PlSto1ul9OBR4LWAgVIXB1B1pRQi3JuNitwOKOz07HaUJZyOmu4SiVYvcYNT7s0qbUCsZwjIJdBHhp/g2a/mf3+GrAdiayHMlXn0rBZaVe/uZ92adH+xh81437yGYVH1UBGH1e8kQ+LQLQpy/1aTNSvOu3baPIO7+mIb9XJ1xv+WMHRVSsfoUczrlv9DbNQyjXyzX/bPrSwJaJFSgJPrHZDHi7s5ZTO8+uV+6ZCgTwDwE=",
  },
  description: "Alphabetical key sorter for YAML and .properties files",
};
