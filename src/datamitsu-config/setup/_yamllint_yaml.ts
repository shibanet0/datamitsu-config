import { indentSettings } from "../constants";
import { yamlIgnore } from "./shared";

export const yamllintYaml: config.ConfigSetup = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "");

    const rules = Object.fromEntries(
      Object.entries({
        ...data?.rules,
        comments: { "min-spaces-from-content": 1 },
        "comments-indentation": "enable",
        "document-end": "disable",
        "document-start": "disable",
        "empty-lines": { max: 1 },
        indentation: { "indent-sequences": true, spaces: indentSettings.indentWidth },
        "key-ordering": "disable",
        "line-length": "disable",
        truthy: { "check-keys": false, level: "error" },
      }).sort(([a], [b]) => a.localeCompare(b)),
    );

    return YAML.stringify(
      Object.fromEntries(
        Object.entries({
          ...data,
          extends: "default",
          ignore: yamlIgnore.join("\n") + "\n",
          rules,
        }).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
  },
  otherFileNameList: [".yamllint", ".yamllint.yml"],
  scope: "git-root",
  tools: ["yamllint"],
};
