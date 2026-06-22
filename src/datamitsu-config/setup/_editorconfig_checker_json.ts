import { safeJsonParse } from "../utils";

export const editorconfigCheckerJson: config.ConfigSetup = {
  content: (context) => {
    const data = safeJsonParse(context.originalContent);

    return (
      JSON.stringify(
        {
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
  scope: "git-root",
  tools: ["editorconfig-checker"],
};
