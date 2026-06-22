import { oxlintConfig } from "../../apps/oxlint";
import { env } from "../env";
import { safeJsonParse } from "../utils";

export const oxlintrcJson: config.ConfigSetup = {
  content: (context) => {
    const previousConfig: any = safeJsonParse(context.originalContent);
    return (
      JSON.stringify(
        {
          ...oxlintConfig,
          ...(env().DATAMITSU_DEV_MODE
            ? {
                rules: oxlintConfig.rules,
              }
            : {
                extends: [
                  tools.Path.forImport(tools.Path.join(context.datamitsuDir, ".oxlintrc.json")),
                ],
                rules: previousConfig.rules,
              }),
          $schema: tools.Path.forImport(
            tools.Path.join(context.datamitsuDir, "oxlint_configuration_schema.json"),
          ),
        },
        null,
        2,
      ) + "\n"
    );
  },
  projectTypes: ["npm-package"],
  tools: ["oxlint"],
};
