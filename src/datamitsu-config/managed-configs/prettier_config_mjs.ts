export const prettierConfigMjs: config.ManagedConfig = {
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
  // The tool's own types: its runs name `{cwd}/prettier.config.mjs` in a tsconfig-only directory too.
  projectTypes: ["npm-package", "typescript-project"],
  tools: ["prettier"],
};
