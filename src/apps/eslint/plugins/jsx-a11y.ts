import type { TypedFlatConfigItem } from "../types";

export async function jsxA11y(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-jsx-a11y-x");

  return [
    {
      name: "shibanet0/jsx-a11y/rules",
      plugins: {
        "jsx-a11y-x": plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },

    {
      rules: {
        "jsx-a11y-x/click-events-have-key-events": "off",
        "jsx-a11y-x/interactive-supports-focus": "off",
        "jsx-a11y-x/no-autofocus": "off",
        "jsx-a11y-x/tabindex-no-positive": "off",
      },
    },
  ];
}
