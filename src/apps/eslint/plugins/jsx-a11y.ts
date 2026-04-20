import type { TypedFlatConfigItem } from "../types";

export async function jsxA11y(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-jsx-a11y");

  return [
    {
      name: "shibanet0/jsx-a11y/rules",
      plugins: {
        "jsx-a11y": plugin.default,
      },
      rules: {
        ...plugin.default.flatConfigs.recommended.rules,
      },
    },

    {
      rules: {
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/interactive-supports-focus": "off",
        "jsx-a11y/no-autofocus": "off",
        "jsx-a11y/tabindex-no-positive": "off",
      },
    },
  ];
}
