import type { TypedFlatConfigItem } from "../types";

export async function reactRefresh(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-react-refresh");

  return [
    {
      name: "shibanet0/react-refresh/rules",
      plugins: {
        "react-refresh": plugin.default,
      },
      rules: {
        ...plugin.default.configs.recommended.rules,
      },
    },
  ];
}
