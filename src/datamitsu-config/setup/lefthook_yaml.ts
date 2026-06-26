export const lefthookYaml: config.ConfigSetup = {
  content: (context) => {
    const existing = YAML.parse(context.originalContent || "");

    return YAML.stringify({
      ...existing,
      "commit-msg": {
        commands: {
          "lint commit message": {
            run: `${facts().binaryCommand} exec commitlint -- --edit {1}`,
          },
        },
      },
      "post-checkout": {
        commands: {
          [`init ${facts().packageName}`]: {
            priority: 2,
            run: `${facts().binaryCommand} init`,
          },
          "install deps": {
            priority: 1,
            run: `pnpm i -y`,
          },
        },
      },
      "pre-commit": {
        commands: {
          ...existing?.["pre-commit"]?.commands,
          [`${facts().packageName}-check`]: {
            priority: 2,
            run: `${facts().binaryCommand} check --file-scoped`,
            stage_fixed: true,
          },
          [`${facts().packageName}-init`]: {
            priority: 1,
            run: `${facts().binaryCommand} init`,
          },
        },
        parallel: false,
      },
    });
  },
  otherFileNameList: [
    ".lefthook.yml",
    "lefthook.yaml",
    ".config/lefthook.yml",
    ".lefthook.yaml",
    ".config/lefthook.yaml",
    "lefthook.toml",
    ".lefthook.toml",
    ".config/lefthook.toml",
    "lefthook.json",
    ".lefthook.json",
    ".config/lefthook.json",
  ],
  scope: "git-root",
};
