import { indentSettings } from "../constants";

/**
 * Canonical non-dotted rustfmt.toml per Rust crate; the dotted variant is removed.
 *
 * Two things this file no longer decides for the project:
 *
 * - **The edition.** It was pinned to 2024 here and rewritten on every reconciliation, so a crate
 *   whose `Cargo.toml` says 2021 got a formatter parsing it as 2024 — a shared config has no basis
 *   for that choice, and rustfmt reads the edition from the crate when nobody overrides it.
 * - **Width and indentation.** 120 columns and hard tabs were literals, in a package whose other nine
 *   formatters all take those two numbers from `indentSettings`. Now they come from there too; a
 *   crate that wants rustfmt's own 100/4 still says so in its own file and keeps it.
 */
export const rustfmtToml: config.ManagedConfig = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    return TOML.stringify({
      hard_tabs: false,
      max_width: indentSettings.lineWidth,
      newline_style: "Unix",
      reorder_imports: true,
      reorder_modules: true,
      tab_spaces: indentSettings.indentWidth,
      ...data,
    });
  },
  otherFileNameList: ["rustfmt.toml", ".rustfmt.toml"],
  projectTypes: ["rust-project"],
  scope: "project",
  tools: ["rustfmt"],
};
