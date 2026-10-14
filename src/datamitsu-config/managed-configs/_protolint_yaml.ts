export const protolintYaml: config.ManagedConfig = {
  content: (context) => {
    const existing = YAML.parse(context.originalContent || "") || {};
    return YAML.stringify({
      ...existing,
      lint: {
        ...existing.lint,
        rules: {
          add: [
            "REPEATED_FIELD_NAMES_PLURALIZED",
            // "MAX_LINE_LENGTH"
          ],
          no_default: true,
          ...existing.lint?.rules,
        },
        rules_option: {
          // max_line_length: { max_chars: indentSettings.lineWidth },
          ...existing.lint?.rules_option,
        },
      },
    });
  },
  ejectable: true,
  otherFileNameList: ["protolint.yaml", ".protolint.yml", "protolint.yml"],
  scope: "git-root",
  tools: ["protolint"],
};
