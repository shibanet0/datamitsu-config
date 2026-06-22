import { indentSettings } from "../constants";
import { yamlIgnore } from "./shared";

export const yamlfmtYaml: config.ConfigSetup = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "");

    const formatter = Object.fromEntries(
      Object.entries({
        ...data?.formatter,
        array_indent: indentSettings.indentWidth,
        eof_newline: true,
        force_array_style: "block",
        force_quote_style: "double",
        indent: indentSettings.indentWidth,
        line_ending: "lf",
        pad_line_comments: 1,
        retain_line_breaks_single: false,
        trim_trailing_whitespace: true,
        type: "basic",
      }).sort(([a], [b]) => a.localeCompare(b)),
    );

    return YAML.stringify(
      Object.fromEntries(
        Object.entries({ ...data, exclude: yamlIgnore, formatter }).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      ),
    );
  },
  otherFileNameList: [".yamlfmt", "yamlfmt.yml", "yamlfmt.yaml", ".yamlfmt.yml"],
  scope: "git-root",
  tools: ["yamlfmt"],
};
