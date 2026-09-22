export const oxfmtConfigTs: config.ManagedConfig = {
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
  /**
   * One config at the git root, even though the operation runs per project.
   *
   * Per-project files were tried and reverted. oxfmt carries no `projectTypes` — it formats by file
   * type, so it has to reach a Go module's markdown and a `docker/` directory's README — and a
   * project-scoped managed config therefore lands in _every_ detected project: measured on a bare
   * fixture, `oxfmt.config.ts` appeared in `.github/workflows/` and `docker/` as well as the root.
   * Correct-but-pointless in the second case and pure litter in the first, in every consuming
   * repository.
   *
   * The operation reads `{root}/oxfmt.config.ts`, so one file serves every run.
   *
   * No manifest is passed, and this content is unconditional. Both existed for one turn, to gate
   * `.svelte` formatting on the project having svelte: that made the content conditional — a Go
   * repository has no `package.json` to import — and made every monorepo answer a question about a
   * language it may not use. The managed oxfmt app ships `svelte` itself now and the option is on
   * for everyone, so this generator has nothing left to decide.
   */
  scope: "git-root",
  tools: ["oxfmt"],
};
