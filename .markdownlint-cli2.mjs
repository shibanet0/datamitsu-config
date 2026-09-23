import { defineConfig } from "./.datamitsu/markdownlint-cli2.config.mjs";

export default defineConfig((base) => ({
  ...base,
  /**
   * `docs/reference/` is written by `scripts/generate-docs-*.ts` from `dm config show`, so a
   * finding there is a finding about the generator, not about a document anyone can edit — and the
   * fix would be overwritten by the next `task refresh`. The generators sanitize tool descriptions
   * rather than author prose, which is where the bare URLs come from.
   */
  ignores: ["docs/reference/**"],
}));
