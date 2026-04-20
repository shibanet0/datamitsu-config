import type { TypedFlatConfigItem } from "../types";

export async function sonarjs(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-sonarjs");

  return [
    {
      name: "shibanet0/sonarjs/rules",
      plugins: {
        sonarjs: plugin.default,
      },
      rules: {
        ...plugin.configs.recommended.rules,
      },
    },
    {
      rules: {
        "sonarjs/class-name": "off",
        "sonarjs/cognitive-complexity": "off",
        "sonarjs/constructor-for-side-effects": "off",
        "sonarjs/duplicates-in-character-class": "off",
        "sonarjs/no-commented-code": "off",
        "sonarjs/no-dead-store": "off",
        "sonarjs/no-duplicate-string": "off",
        "sonarjs/no-empty-test-file": "off",
        "sonarjs/no-extra-arguments": "off",
        "sonarjs/no-ignored-exceptions": "off",
        "sonarjs/no-nested-conditional": "off",
        "sonarjs/no-nested-functions": "off",
        "sonarjs/no-nested-template-literals": "off",
        "sonarjs/no-os-command-from-path": "off",
        "sonarjs/no-small-switch": "off",
        "sonarjs/os-command": "off",
        "sonarjs/redundant-type-aliases": "off",
        "sonarjs/slow-regex": "off",
        "sonarjs/todo-tag": "off",
        "sonarjs/unused-import": "off",
      },
    },
  ];
}
