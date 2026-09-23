// Exact legacy defaults migrate to the base even if a project chose them deliberately:
// the base is a superset, also permitting dot-directories and __x__ names.
export const lsLintYml: config.ManagedConfig = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "") ?? {};
    const ls = { ...data.ls };
    if (ls[".dir"] === "kebab-case | snake_case") {
      delete ls[".dir"];
    }
    const legacyIgnore = [".git", "node_modules", "dist"];
    if (
      Array.isArray(data.ignore) &&
      data.ignore.length === legacyIgnore.length &&
      data.ignore.every((value: unknown, index: number) => value === legacyIgnore[index])
    ) {
      delete data.ignore;
    }

    return (
      String.raw`# Layers over .datamitsu/ls-lint-managed.yml.
# Redefining .dir replaces the base rule; restate regex:\.[a-z0-9_-]+ for dot-directories.
# ignore adds exclusions to the base.
` + YAML.stringify({ ...data, ls })
    );
  },
  ejectable: true,
  otherFileNameList: [".ls-lint.yaml"],
  scope: "git-root",
  tools: ["ls-lint"],
};
