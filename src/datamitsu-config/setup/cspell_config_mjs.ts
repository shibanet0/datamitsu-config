export const cspellConfigMjs: config.ConfigSetup = {
  content: (context) => {
    return /*js*/ `import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "cspell.config.mjs"))}";

export default defineConfig();
`;
  },
  otherFileNameList: [
    ".cspell.config.yaml",
    ".cspell.config.yml",
    "cspell.config.yaml",
    "cspell.config.yml",
    ".cspell.yaml",
    ".cspell.yml",
    "cspell.yaml",
    "cspell.yml",
    ".cspell.json",
    "cspell.json",
    ".cSpell.json",
    "cSpell.json",
    ".cspell.jsonc",
    "cspell.jsonc",
    ".cspell.config.json",
    ".cspell.config.jsonc",
    "cspell.config.json",
    "cspell.config.jsonc",
    "cspell.config.js",
    "cspell.config.mjs",
    "cspell.config.cjs",
    ".cspell.config.mjs",
    ".cspell.config.cjs",
    ".cspell.config.js",
    "cspell.config.mts",
    "cspell.config.ts",
    "cspell.config.cts",
    ".cspell.config.mts",
    ".cspell.config.ts",
    ".cspell.config.cts",
    "cspell.config.toml",
    ".cspell.config.toml",
  ],
  scope: "git-root",
  tools: ["cspell"],
};
