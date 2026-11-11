import { indentSettings } from "../constants";

export const styluaToml: config.ManagedConfig = {
  content: (context) => {
    const existing = TOML.parse(context.originalContent || "");
    return TOML.stringify(
      merge(
        {
          column_width: indentSettings.lineWidth,
          indent_type: "Spaces",
          indent_width: indentSettings.indentWidth,
          line_endings: "Unix",
        },
        existing,
      ),
    );
  },
  ejectable: true,
  scope: "git-root",
  tools: ["stylua"],
};
