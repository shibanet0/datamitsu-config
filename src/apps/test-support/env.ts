import { devNull } from "node:os";

export function fixtureEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  // Hook processes inherit repository paths and proxy state; fixtures must start outside both.
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/^(?:GIT_|LEFTHOOK|DATAMITSU_LEFTHOOK_)/.test(key),
    ),
  );
  return {
    ...inherited,
    GIT_CONFIG_GLOBAL: devNull,
    GIT_CONFIG_SYSTEM: devNull,
    ...overrides,
  };
}
