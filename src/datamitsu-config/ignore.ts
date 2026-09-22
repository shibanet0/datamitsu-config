import { resolve } from "../ignore/profile";
import { gitignoreProfile } from "../ignore/profiles/gitignore";

const stripFromIgnore = new Set<string>([".claude/"]);

export const filterIgnore = (content: string): string => {
  return content
    .split("\n")
    .filter((line) => !stripFromIgnore.has(line))
    .join("\n");
};

export const ignoreGroups: tools.Ignore.IgnoreMap<
  | "Build outputs"
  | "Cache & temporary files"
  | "Claude Code project files"
  | "Codex CLI project files"
  | "Dependencies"
  | "Environment"
  | "Golang specific"
  | "IDE & OS"
  | "Logs"
  | "Other"
  | "Pulumi"
  | "ralphex progress logs"
  | "Security & Secrets"
  | "Terraform & Terragrunt"
  | "Testing"
> = resolve(gitignoreProfile);
