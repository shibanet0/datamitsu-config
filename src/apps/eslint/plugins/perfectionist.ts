import type { TypedFlatConfigItem } from "../types";

export async function perfectionist(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-perfectionist");

  return [
    {
      files: ["**/*.css.ts"],
      name: "shibanet0/perfectionist/vanilla-extract/rules",
      plugins: {
        perfectionist: plugin.default,
      },
      rules: {
        "perfectionist/sort-objects": "off",
      },
    },
    {
      name: "shibanet0/perfectionist/rules",
      plugins: {
        perfectionist: plugin.default,
      },
      rules: {
        ...plugin.default.configs["recommended-natural"].rules,
        "perfectionist/sort-imports": [
          "error",
          {
            customGroups: [
              {
                elementNamePattern: ["^i18next$", "^i18next-.+"],
                groupName: "i18next",
              },
              {
                elementNamePattern: [
                  "^react$",
                  "^react-.+",
                  "^@react-.+",
                  "^swr$",

                  "^next$",
                  "^next/.+",
                  "^next-.+",
                  "^@next-.+",
                ],
                groupName: "react",
              },
              {
                elementNamePattern: ["^antd$", "^@ant-design.+"],
                groupName: "antd",
              },
              {
                elementNamePattern: [
                  "^fastify$",
                  "^@fastify.+",
                  "^@sinclair/typebox$",
                  "^typebox$",
                ],
                groupName: "fastify",
              },
              // {
              //   elementNamePattern: [
              //     String.raw`.+\.avif$`,
              //     String.raw`.+\.webp$`,
              //     String.raw`.+\.svg$`,
              //     String.raw`.+\.png$`,
              //     String.raw`.+\.jpg$`,
              //     String.raw`.+\.jpeg$`,
              //     String.raw`.+\.gif$`,
              //   ],
              //   groupName: "media/images",
              // },
            ],
            groups: [
              "i18next",
              "react",
              "antd",
              "fastify",
              // "media/images",

              "type-import",
              ["value-builtin", "value-external"],
              "type-internal",
              "value-internal",
              ["type-parent", "type-sibling", "type-index"],
              ["value-parent", "value-sibling", "value-index"],
              "ts-equals-import",
              "unknown",
            ],
            order: "asc",
            type: "alphabetical",
          },
        ],
      },
    },
    {
      rules: {
        // "perfectionist/sort-objects": "off",
        // "perfectionist/sort-variable-declarations": "off",
        // "perfectionist/sort-jsx-props": "off",
        // "perfectionist/sort-modules": "off",
        // "perfectionist/sort-classes": "off",
        // "perfectionist/sort-enums": "off",
      },
    },
  ];
}
