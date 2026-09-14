import { data as archiveLefthookSort } from "../inline-config/lefthook-sort";
import nodeVersions from "../registries/nodeVersions.json";

// The inline entrypoint resolves its external YAML parser from the managed app environment.
export const lefthookSortApp: BinManager.App = {
  archives: {
    main: {
      inline: archiveLefthookSort,
    },
  },
  bun: {
    binPath: "index.mjs",
    ...nodeVersions.yaml,
    lockFile:
      "br:G6EBIBwHdqyxIP/ilUkIXTUwz75URFwNQoMozPVtEBe0vIPn1OdU8Yikwh9T6AhXveqZOBwXpFk7+4xhQbDpzKyjApQJCiyUXgmC7B2ttVoub/fvLhqAQkODxVJafO3IyvCYw0IgD4HL210pSsglGefb5X1yx6fHwzAhLeR0UzCETFBrjBrvdmFTKgVjWI2CXQR4Kf4Fmv5n+/gq7pspTzM4Y782xYg9zqTfQph8xbjoHu3lQAc0Hw2F4em6o+634WGfZvPL+ECu8zhPtt9neGXSZcyMg09f7RYHB2WzOU3dl3n2yLi5resHkK6XK/7R9KUADR3NEQK4Y7Pp3dmetJzaaXo5cs9UIIB/AA==",
  },
  description: nodeVersions.yaml.description,
  links: {
    "lefthook-sort.mjs": "index.mjs",
  },
};
