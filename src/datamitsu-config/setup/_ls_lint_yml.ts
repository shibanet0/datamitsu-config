// ls-lint filename/directory conventions. ls-lint needs at least one rule or it
// errors, so a permissive starter `ls` block is provided — tighten the
// per-extension rules to your naming policy. `ignore` skips vendored/build dirs.
export const lsLintYml: config.ConfigSetup = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "") ?? {};

    return YAML.stringify({
      ignore: data.ignore ?? [".git", "node_modules", "dist"],
      ls: { ".dir": "kebab-case | snake_case", ...data.ls },
    });
  },
  otherFileNameList: [".ls-lint.yaml"],
  scope: "git-root",
  tools: ["ls-lint"],
};
