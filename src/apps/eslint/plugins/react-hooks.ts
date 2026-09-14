import type { TypedFlatConfigItem } from "../types";

export async function reactHooks(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-react-hooks");

  return [
    {
      name: "s0/react-hooks/rules",
      plugins: {
        "react-hooks": plugin.default,
      },
      rules: {
        ...plugin.default.configs.flat["recommended-latest"].rules,
      },
    },
  ];
}
