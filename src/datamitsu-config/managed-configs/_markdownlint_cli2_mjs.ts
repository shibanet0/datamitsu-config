export const markdownlintCli2Mjs: config.ManagedConfig = {
  content: (context) => {
    return [
      `import { defineConfig } from "${tools.Path.forImport(
        tools.Path.join(context.datamitsuDir, "markdownlint-cli2.config.mjs"),
      )}";`,
      "",
      "export default defineConfig();",
      "",
    ].join("\n");
  },
  /**
   * `.mjs` because the config is a module, and a plain `.js` is CommonJS in any project without
   * `"type": "module"` — the same reason `prettier.config.mjs` and `stylelint.config.mjs` use it.
   *
   * Every other name markdownlint-cli2 discovers is listed so `datamitsu config reconcile` removes
   * it. The managed run names `--config` explicitly and never goes through discovery, so a leftover
   * could not hijack it — what it would capture is the editor extension and a bare `dm exec
   * markdownlint-cli2`, which is exactly where a second answer is most confusing.
   */
  otherFileNameList: [
    ".markdownlint-cli2.jsonc",
    ".markdownlint-cli2.yaml",
    ".markdownlint-cli2.cjs",
    ".markdownlint.jsonc",
    ".markdownlint.json",
    ".markdownlint.yaml",
    ".markdownlint.yml",
    ".markdownlint.cjs",
    ".markdownlint.mjs",
  ],
  scope: "git-root",
  tools: ["markdownlint-cli2"],
};
