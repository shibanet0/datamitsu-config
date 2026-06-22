export const prettierConfigMjs: config.ConfigSetup = {
  content: (context) => {
    return [
      `import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "prettier.config.mjs"))}";`,
      "",
      `const config = defineConfig();`,
      "",
      "export default config;",
      "",
    ].join("\n");
  },
  otherFileNameList: [
    ".prettierrc",
    ".prettierrc.json",
    ".prettierrc.yml",
    ".prettierrc.yaml",
    ".prettierrc.json5",
    ".prettierrc.js",
    "prettier.config.js",
    ".prettierrc.ts",
    "prettier.config.ts",
    ".prettierrc.mjs",
    "prettier.config.mjs",
    ".prettierrc.mts",
    "prettier.config.mts",
    ".prettierrc.cjs",
    "prettier.config.cjs",
    ".prettierrc.cts",
    "prettier.config.cts",
    ".prettierrc.toml",
  ],
  projectTypes: ["npm-package"],
  tools: ["prettier"],
};
