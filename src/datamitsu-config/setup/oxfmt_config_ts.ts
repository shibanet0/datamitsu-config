export const oxfmtConfigTs: config.ConfigSetup = {
  content: (context) => {
    return [
      `import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "oxfmt.config.js"))}";`,
      "",
      "export default defineConfig();",
      "",
    ].join("\n");
  },
  otherFileNameList: [
    ".oxfmtrc",
    ".oxfmtrc.json",
    ".oxfmtrc.jsonc",
    "oxfmt.config.js",
    "oxfmt.config.mjs",
    "oxfmt.config.cjs",
    "oxfmt.config.ts",
    "oxfmt.config.mts",
    "oxfmt.config.cts",
  ],
  scope: "git-root",
  tools: ["oxfmt"],
};
