import { indentSettings } from "../constants";

export const helmfmt: config.ManagedConfig = {
  content: (context) =>
    JSON.stringify(
      merge(
        {
          indent_size: indentSettings.indentWidth,
          rules: { indent: { printf: { disabled: true } } },
        },
        JSON.parse(context.originalContent || "{}"),
      ),
      null,
      indentSettings.indentWidth,
    ) + "\n",
  projectTypes: ["helm-chart"],
  scope: "project",
  tools: ["helmfmt"],
};
