import type { KnipConfig } from "knip";
export type * from "knip";

export const config: KnipConfig = {
  entry: ["src/index.ts"],
  project: ["src/**/*.ts"],
};
