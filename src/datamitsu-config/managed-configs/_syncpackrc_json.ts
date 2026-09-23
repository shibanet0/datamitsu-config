export const syncpackrcJson: config.ManagedConfig = {
  content: () => {
    return (
      JSON.stringify(
        {
          /**
           * Exact versions everywhere, except peers, which carry a caret.
           *
           * One group over `["**"]` was the whole policy before, and it applied the exact-version
           * rule to `peerDependencies` as well: a package declaring `react` as `^19.2.3` — the
           * range a peer is supposed to have — was reported as a mismatch to be "fixed" down to
           * `19.2.3`, which is a peer no consumer can satisfy alongside any other version. `!peer`
           * is syncpack's negation, so the two groups partition the dependency types rather than
           * overlapping.
           */
          semverGroups: [
            {
              dependencies: ["**"],
              dependencyTypes: ["peer"],
              packages: ["**"],
              range: "^",
            },
            {
              dependencies: ["**"],
              dependencyTypes: ["!peer"],
              packages: ["**"],
              range: "",
            },
          ],
          versionGroups: [
            {
              dependencies: ["$LOCAL"],
              dependencyTypes: ["!local"],
              label: "use workspace protocol for local packages",
              pinVersion: "workspace:*",
            },
          ],
        },
        null,
        2,
      ) + "\n"
    );
  },
  otherFileNameList: [
    ".syncpackrc",
    ".syncpackrc.json",
    ".syncpackrc.yaml",
    ".syncpackrc.yml",
    ".syncpackrc.js",
    ".syncpackrc.ts",
    ".syncpackrc.mjs",
    ".syncpackrc.cjs",
    "syncpack.config.js",
    "syncpack.config.cjs",
    "syncpack.config.ts",
    "syncpack.config.mjs",
  ],
  projectTypes: ["npm-package"],
  scope: "git-root",
  tools: ["syncpack"],
};
