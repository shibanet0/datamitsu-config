import configConventional from "@commitlint/config-conventional";
import { type UserConfig } from "@commitlint/types";
import { fileURLToPath } from "node:url";

export const config = {
  ...configConventional,
  formatter: fileURLToPath(import.meta.resolve("@commitlint/format")),
  parserPreset: fileURLToPath(import.meta.resolve("conventional-changelog-conventionalcommits")),
} satisfies UserConfig;
