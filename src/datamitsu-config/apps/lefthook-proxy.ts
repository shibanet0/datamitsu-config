import { data as archiveLefthookProxy } from "../inline-config/lefthook-proxy";
import { apps as githubApps, binaries as githubBinaries } from "../registries/githubApps.json";
import nodeVersions from "../registries/nodeVersions.json";

// The public `lefthook` app is a Datamitsu-owned Node wrapper, not upstream Lefthook: it isolates
// the working tree before handing control to `dm-internal-lefthook-upstream`. See
// docs/reference/lefthook-proxy.md for what it does and how to recover from a failed restore.
//
// The app's binary IS the bundled script (index.mjs, shipped via the inline archive with a node
// shebang), so it needs no npm package of its own — but a node app must declare one, and every
// declared node app must pin a lock file. It anchors on `yaml`, which `lefthook-sort` installs
// anyway, so this adds no new download to the store. The spec is written out in full rather than
// spread from `lefthookSortApp.node`: sharing that object silently coupled this app's install spec
// to an unrelated tool's dependency bump.
export const lefthookProxyApp: BinManager.App = {
  archives: {
    main: {
      inline: archiveLefthookProxy,
    },
  },
  description: githubBinaries.lefthook.description,
  env: {
    DATAMITSU_LEFTHOOK_UPSTREAM_DIR: "${STORE}/.bin/dm-internal-lefthook-upstream",
    DATAMITSU_LEFTHOOK_UPSTREAM_VERSION: githubApps.lefthook.tag,
  },
  node: {
    binPath: "index.mjs",
    ...nodeVersions.yaml,
    lockFile:
      "br:G6EBIBwHdqyxIP/ilUkIXTUwz75URFwNQoMozPVtEBe0vIPn1OdU8Yikwh9T6AhXveqZOBwXpFk7+4xhQbDpzKyjApQJCiyUXgmC7B2ttVoub/fvLhqAQkODxVJafO3IyvCYw0IgD4HL210pSsglGefb5X1yx6fHwzAhLeR0UzCETFBrjBrvdmFTKgVjWI2CXQR4Kf4Fmv5n+/gq7pspTzM4Y782xYg9zqTfQph8xbjoHu3lQAc0Hw2F4em6o+634WGfZvPL+ECu8zhPtt9neGXSZcyMg09f7RYHB2WzOU3dl3n2yLi5resHkK6XK/7R9KUADR3NEQK4Y7Pp3dmetJzaaXo5cs9UIIB/AA==",
  },
  required: true,
};
