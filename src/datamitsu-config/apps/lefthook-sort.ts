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
      "br:G6EBIBwHdjtOkFuxyiSE51NDdtt/WiSVN/rKDaIw17dBXNDyDp5Tn1PFI5IKf0yhI1z1uk3w6LiqGG7maYkFwa4zt44aWKUYuFB6LQiyd7TWZrW6g+8uGohGQ4PlSto1ul9OBR4LWAgVIXB1B1pRQi3JuNitwOKOz07HaUJZyOmu4SiVYvcYNT7s0qbUCsZwjIJdBHhp/g2a/mf3+GrAdiayHMlXn0rBZaVe/uZ92adH+xh81437yGYVH1UBGH1e8kQ+LQLQpy/1aTNSvOu3baPIO7+mIb9XJ1xv+WMHRVSsfoUczrlv9DbNQyjXyzX/bPrSwJaJFSgJPrHZDHi7s5ZTO8+uV+6ZCgTwDwE=",
  },
  description: nodeVersions.yaml.description,
  links: {
    "lefthook-sort.mjs": "index.mjs",
  },
};
