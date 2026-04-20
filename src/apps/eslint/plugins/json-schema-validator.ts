import type { TypedFlatConfigItem } from "../types";

export async function jsonSchemaValidator(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-json-schema-validator");

  return [
    ...plugin.default.configs["flat/recommended"],
    // {
    //   name: "shibanet0/json-schema-validator/rules",
    //   plugins: {
    //     "json-schema-validator": plugin.default,
    //   },
    //   rules: {
    //     ...plugin.default.configs["flat/recommended"].rules,
    //   },
    // },
  ];
}
