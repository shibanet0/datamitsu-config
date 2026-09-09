export const oxlintConfigMts: config.ConfigSetup = {
  content: (context) => {
    // The manifest is passed for the same reason `eslint.config.mjs` passes it: which framework
    // plugins run is a question about the project. Without it oxlint enabled `nextjs`, `react`,
    // `vue`, `vitest` and the rest everywhere, so a package with no Next.js in its tree still
    // failed on `next/no-img-element`.
    //
    // `./package.json` resolves next to this file, which in a monorepo is the workspace package's
    // own manifest rather than the root's — the granularity oxlint runs at anyway.
    return [
      `import { defineConfig } from "${tools.Path.forImport(tools.Path.join(context.datamitsuDir, "oxlint.config.js"))}";`,
      "",
      `import packageJSON from "./package.json" with { type: "json" };`,
      "",
      "export default defineConfig(packageJSON);",
      "",
    ].join("\n");
  },
  /**
   * `.mts` rather than `.ts`, and TypeScript rather than JavaScript.
   *
   * Oxlint discovers exactly four names — `.oxlintrc.json`, `.oxlintrc.jsonc`, `oxlint.config.ts`
   * and `oxlint.config.mts` — and `-c` is not enough on its own, because the editor extension and
   * the LSP find the config by discovery, not by the flag the runner passes. So a `.mjs` config
   * would work on the command line and silently stop working in the editor.
   *
   * Of the two module-capable names, `.mts` is unambiguous: `.ts` is read as CommonJS by anything
   * that consults `package.json#type` in a project that does not set it.
   *
   * The cost is one Node type-stripping pass, measured at ~30 ms against ~1.5 s for a full oxlint
   * run on this repository.
   */
  otherFileNameList: [
    ".oxlintrc",
    ".oxlintrc.json",
    ".oxlintrc.jsonc",
    "oxlint.config.cjs",
    "oxlint.config.cts",
    "oxlint.config.js",
    "oxlint.config.mjs",
    "oxlint.config.ts",
  ],
  projectTypes: ["npm-package"],
  tools: ["oxlint"],
};
