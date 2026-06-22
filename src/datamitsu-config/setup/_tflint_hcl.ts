export const tflintHcl: config.ConfigSetup = {
  content: (context) => {
    const existing = context.originalContent || "";
    if (existing.trim().length > 0) {
      return existing;
    }

    return [
      `plugin "terraform" {`,
      `  enabled = true`,
      `  preset  = "recommended"`,
      `}`,
      // ``,
      // `plugin "aws" {`,
      // `  enabled = true`,
      // `  version = "0.47.0"`,
      // `  source  = "github.com/terraform-linters/tflint-ruleset-aws"`,
      // `}`,
      // ``,
      // `plugin "terraform" {`,
      // `  enabled = true`,
      // `  version = "0.14.1"`,
      // `  source  = "github.com/terraform-linters/tflint-ruleset-terraform"`,
      // `}`,
      ``,
    ].join("\n");
  },
  projectTypes: ["terraform-project"],
  scope: "git-root",
  tools: ["tflint"],
};
