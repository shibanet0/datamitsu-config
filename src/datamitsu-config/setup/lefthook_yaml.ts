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
      glob_matcher: "doublestar",
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
        // priority is only honoured for sequential hooks
        parallel: false,
      },
      "pre-commit": {
        // Priorities are assigned in phase bands so the file reads top-to-bottom
        // in execution order (lefthook runs lowest priority first):
        //   fix   10–90   mutators that rewrite/stage files
        //   check 100–190 validations that only read
        //   test  200+    slower verification
        // Downstream projects slot their own commands into the same bands.
        // Sorting and validating the lefthook config itself are not commands
        // here: they are the `lefthook-sort` (fix) and `lefthook-validate`
        // (lint) tools, so they run inside `check` like every other tool.
        commands: {
          ...existing?.["pre-commit"]?.commands,
          [`${facts().packageName}-check`]: {
            priority: 40,
            run: `${facts().binaryCommand} check --file-scoped`,
            stage_fixed: true,
          },
          [`${facts().packageName}-init`]: {
            priority: 10,
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
