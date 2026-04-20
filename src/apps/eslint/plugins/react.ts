import type { TypedFlatConfigItem } from "../types";

export async function react(
  options:
    | undefined
    | {
        disabled?: boolean;
        version?: string;
      },
): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-react");

  return [
    {
      name: "shibanet0/react/rules",
      plugins: {
        react: plugin.default,
      },
      rules: {
        ...plugin.default.configs["jsx-runtime"].rules,
        ...plugin.default.configs.recommended.rules,
        "react/destructuring-assignment": "off", // TODO
        "react/display-name": "off",
        "react/forbid-component-props": "off", // TODO
        "react/forward-ref-uses-ref": "off",
        "react/function-component-definition": "off",
        "react/iframe-missing-sandbox": "off",
        "react/jsx-child-element-spacing": "off",
        "react/jsx-closing-tag-location": "off", // TODO
        "react/jsx-curly-newline": "off", // TODO
        "react/jsx-filename-extension": "off",
        "react/jsx-handler-names": "off",
        "react/jsx-indent": "off", // TODO
        // "react/jsx-max-depth": "off", // TODO
        "react/jsx-max-props-per-line": "off", // TODO
        "react/jsx-newline": "off", // TODO
        "react/jsx-no-bind": "off", // TODO
        "react/jsx-no-literals": "off", // TODO
        "react/jsx-no-useless-fragment": "off",
        "react/jsx-one-expression-per-line": "off", // TODO
        "react/jsx-pascal-case": "off",
        "react/jsx-props-no-spreading": "off",
        "react/jsx-sort-props": "off", // TODO
        "react/no-array-index-key": "off", // TODO
        "react/no-unknown-property": "off",
        "react/no-unused-prop-types": "warn",
        "react/prefer-read-only-props": "off", // TODO
        "react/prop-types": "off",
        "react/react-in-jsx-scope": "off",
        "react/require-default-props": "off",
      },
      settings: {
        react: {
          version: options?.version || "latest",
        },
      },
    },
  ];
}
