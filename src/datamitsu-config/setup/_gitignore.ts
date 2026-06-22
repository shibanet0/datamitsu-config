import { filterIgnore, ignoreGroups } from "../ignore";

export const gitignore: config.ConfigSetup = {
  content: (context) => {
    const mergedRules = tools.Ignore.parse(
      [tools.Ignore.stringify(ignoreGroups), filterIgnore(context.originalContent || "")].join(
        "\n",
      ),
    );

    return tools.Ignore.stringify(mergedRules.groups, mergedRules.groupOrder) + "\n";
  },
  scope: "git-root",
};
