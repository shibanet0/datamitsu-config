import { safeJsonParse } from "../utils";

export const editorconfigCheckerJson: config.ManagedConfig = {
  content: (context) => {
    const data = safeJsonParse(context.originalContent);

    return (
      JSON.stringify(
        {
          // Since v4 the checker prints `::error` workflow commands instead of its report when
          // GITHUB_ACTIONS is set and no format is configured, so CI output differed from a local
          // run. Pinned before `...data`, so a project can still choose another format.
          Format: "default",
          ...data,
          Disable: {
            ...data.Disable,
          },
        },
        null,
        2,
      ) + "\n"
    );
  },
  ejectable: true,
  scope: "git-root",
  tools: ["editorconfig-checker"],
};
