export const knipConfigJs: config.ConfigSetup = {
  content: (context) => {
    return [
      `import { defineConfig } from "${tools.Path.forImport(
        tools.Path.join(context.datamitsuDir, "knip.config.js"),
      )}";`,
      "",
      `export default defineConfig();`,
      "",
    ].join("\n");
  },
  otherFileNameList: [
    "knip.json",
    "knip.jsonc",
    ".knip.json",
    ".knip.jsonc",
    "knip.ts",
    "knip.js",
    "knip.config.ts",
    "knip.config.js",
  ],
  projectTypes: ["npm-package"],
  scope: "git-root",
  tools: ["knip"],
};
