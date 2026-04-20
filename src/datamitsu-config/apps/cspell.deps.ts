import fnmVersions from "../registries/fnmVersions.json";

export const cspellDeps = {
  "@cspell/dict-ru_ru": fnmVersions["@cspell/dict-ru_ru"].version,
  cspell: fnmVersions["cspell"].version,
} as const;
