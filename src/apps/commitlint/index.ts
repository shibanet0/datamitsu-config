import configConventional from "@commitlint/config-conventional";
import { type UserConfig } from "@commitlint/types";

export const config = {
  ...configConventional,
  formatter: import.meta.resolve("@commitlint/format"),
  parserPreset: import.meta.resolve("conventional-changelog-conventionalcommits"),
} satisfies UserConfig;
