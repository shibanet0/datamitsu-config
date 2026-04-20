import type { TypedFlatConfigItem } from "../types";

export async function reactPreferFunctionComponent(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-react-prefer-function-component");
  const cfg = await import("eslint-plugin-react-prefer-function-component/config");

  return [
    {
      name: "shibanet0/react-prefer-function-component/rules",
      plugins: {
        "react-prefer-function-component": plugin.default,
      },
      rules: {
        ...cfg.default.configs.recommended.rules,
      },
    },
  ];
}
