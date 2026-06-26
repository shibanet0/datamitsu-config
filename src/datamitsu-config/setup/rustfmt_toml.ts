// Canonical non-dotted rustfmt.toml per Rust crate; the dotted variant is removed.
export const rustfmtToml: config.ConfigSetup = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    return TOML.stringify({
      ...data,
      edition: "2024",
      hard_tabs: true,
      max_width: 120,
      newline_style: "Unix",
      reorder_imports: true,
      reorder_modules: true,
      tab_spaces: 2,
    });
  },
  otherFileNameList: ["rustfmt.toml", ".rustfmt.toml"],
  projectTypes: ["rust-project"],
  scope: "project",
  tools: ["rustfmt"],
};
