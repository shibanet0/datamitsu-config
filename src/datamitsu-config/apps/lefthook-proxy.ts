import { data as archiveLefthookProxy } from "../inline-config/lefthook-proxy";
import { binaries as githubBinaries } from "../registries/githubApps.json";
import nodeVersions from "../registries/nodeVersions.json";

// The inline archive owns the executable; yaml anchors the managed dependency environment.
export const lefthookProxyApp: BinManager.App = {
  archives: {
    main: {
      inline: archiveLefthookProxy,
    },
  },
  bun: {
    binPath: "index.mjs",
    ...nodeVersions.yaml,
    lockFile:
      "br:G6EBIBwHdjtOkFuxyiSE51NDdtt/WiSVN/rKDaIw17dBXNDyDp5Tn1PFI5IKf0yhI1z1uk3w6LiqGG7maYkFwa4zt44aWKUYuFB6LQiyd7TWZrW6g+8uGohGQ4PlSto1ul9OBR4LWAgVIXB1B1pRQi3JuNitwOKOz07HaUJZyOmu4SiVYvcYNT7s0qbUCsZwjIJdBHhp/g2a/mf3+GrAdiayHMlXn0rBZaVe/uZ92adH+xh81437yGYVH1UBGH1e8kQ+LQLQpy/1aTNSvOu3baPIO7+mIb9XJ1xv+WMHRVSsfoUczrlv9DbNQyjXyzX/bPrSwJaJFSgJPrHZDHi7s5ZTO8+uV+6ZCgTwDwE=",
  },
  dependsOn: ["dm-internal-lefthook-upstream"],
  description: githubBinaries.lefthook.description,
  runtimeEnv: {
    DATAMITSU_LEFTHOOK_UPSTREAM: "${APP_BIN:dm-internal-lefthook-upstream}",
  },
  versionCheck: {
    args: ["--proxy-version"],
  },
};
