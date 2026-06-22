export const commitlintConfigMjs: config.ConfigSetup = {
  content: (context) => {
    return /* js */ `import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "commitlint.config.js"))}";

export default defineConfig();
`;
  },
  otherFileNameList: [
    ".commitlintrc",
    ".commitlintrc.json",
    ".commitlintrc.yaml",
    ".commitlintrc.yml",
    ".commitlintrc.js",
    ".commitlintrc.cjs",
    ".commitlintrc.mjs",
    ".commitlintrc.ts",
    ".commitlintrc.cts",
    ".commitlintrc.mts",
    "commitlint.config.js",
    "commitlint.config.cjs",
    "commitlint.config.mjs",
    "commitlint.config.ts",
    "commitlint.config.cts",
    "commitlint.config.mts",
  ],
  scope: "git-root",
};
