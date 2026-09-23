export const typosToml: config.ManagedConfig = {
  /**
   * Typos had no config file at all, and the comment in `tools.ts` told projects to curate one that
   * nothing created. Without it there is nowhere to say "this is a name, not a misspelling" — and a
   * toolchain repository is full of those: `decorder` and `importas` are golangci-lint linters,
   * `Automattic` is a company, `CPY` is a Dockerfile instruction. Each one is reported as a typo of
   * the English word it resembles, and the only alternative to a config was turning the tool off.
   *
   * The file starts empty on purpose. Its content is the project's vocabulary, so this generator
   * seeds the shape and then never touches what a project writes into it.
   */
  content: (context) => {
    const existing = context.originalContent?.trim();

    if (existing) {
      return `${existing}\n`;
    }

    return [
      "# Words typos must not correct. A key mapped to itself is an allowlist entry:",
      "#",
      "#   [default.extend-words]",
      '#   decorder = "decorder"   # a golangci-lint linter, not a misspelt decoder',
      "#",
      "# Identifiers (code symbols, as opposed to words inside them) go under",
      "# [default.extend-identifiers], and whole paths under [files] extend-exclude.",
      "",
      "[default.extend-words]",
      "# LaTeX auxiliary extensions, from the file-nesting map datamitsu itself writes into",
      "# .vscode/settings.json. typos reads them as misspellings of `can` and `is`; a project that",
      "# never opens a .tex file still has the setting, because the package generated it.",
      'acn = "acn"',
      'ist = "ist"',
      "",
    ].join("\n");
  },
  otherFileNameList: ["typos.toml", "_typos.toml"],
  scope: "git-root",
  tools: ["typos"],
};
