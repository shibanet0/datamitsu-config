export const stylelintConfigMjs: config.ManagedConfig = {
  content: (context) => {
    return [
      `import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "stylelint.config.mjs"))}";`,
      "",
      "export default defineConfig();",
      "",
    ].join("\n");
  },
  /**
   * `.mjs` for the reason `prettier.config.mjs` uses it: stylelint reads the config as a module,
   * and a plain `.js` is CommonJS in any project that does not set `"type": "module"`.
   *
   * Every other name stylelint discovers is listed so `datamitsu config reconcile` removes it —
   * `init` writes no managed configs at all. The managed run cannot be hijacked by a leftover
   * either way, because it names `--config` explicitly and never goes through discovery; what a
   * stray `.stylelintrc` would capture is the editor extension and a bare `dm exec stylelint`.
   */
  otherFileNameList: [
    ".stylelintrc",
    ".stylelintrc.json",
    ".stylelintrc.yaml",
    ".stylelintrc.yml",
    ".stylelintrc.js",
    ".stylelintrc.mjs",
    ".stylelintrc.cjs",
    ".stylelintrc.ts",
    ".stylelintrc.mts",
    ".stylelintrc.cts",
    "stylelint.config.js",
    "stylelint.config.mjs",
    "stylelint.config.cjs",
    "stylelint.config.ts",
    "stylelint.config.mts",
    "stylelint.config.cts",
  ],
  /**
   * Both types the tool itself declares. A directory with a `tsconfig.json` and no `package.json`
   * is a `typescript-project`, so the operations run there — and with only `npm-package` here, the
   * config they name (`{cwd}/stylelint.config.mjs`) would never be generated and both would fail on
   * the first stylesheet, even after a reconcile.
   */
  projectTypes: ["npm-package", "typescript-project"],
  tools: ["stylelint"],
};
