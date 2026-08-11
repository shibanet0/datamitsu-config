// alint (repository-structure linter) config. Extends the bundled `oss-baseline`
// ruleset; layer more bundled sets (rust, node, python, go, ci/github-actions, …)
// or add your own rules. `alint init` can auto-detect a starting config.
export const alintYml: config.ConfigSetup = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "") ?? {};

    return YAML.stringify({ extends: data.extends ?? ["oss-baseline"], ...data });
  },
  otherFileNameList: [".alint.yaml"],
  scope: "git-root",
  tools: ["alint"],
};
