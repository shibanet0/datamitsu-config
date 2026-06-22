export const syncpackrcJson: config.ConfigSetup = {
  content: () => {
    return (
      JSON.stringify(
        {
          semverGroups: [
            {
              dependencies: ["**"],
              dependencyTypes: ["**"],
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
