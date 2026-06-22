import { safeJsonParse } from "../utils";

export const turboJson: config.ConfigSetup = {
  content: (context) => {
    const data = safeJsonParse(context.originalContent);

    return (
      JSON.stringify(
        {
          ...data,
          $schema: "https://turbo.build/schema.json",
          globalEnv: ["TZ", "PORT", "CI"],
          tasks: {
            ...data.tasks,
            build: {
              dependsOn: ["build:lib", "^build"],
              outputs: ["dist/**", ".next/**", "!.next/cache/**"],
            },
            "build:lib": {
              dependsOn: ["^build:lib"],
              outputs: ["dist/**", ".next/**", "!.next/cache/**"],
            },
          },
        },
        null,
        2,
      ) + "\n"
    );
  },
  projectTypes: ["turbo-package"],
  scope: "git-root",
};
