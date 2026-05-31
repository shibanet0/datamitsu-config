import nodeVersions from "../registries/nodeVersions.json";

export const cspellDeps = {
  "@cspell/dict-ru_ru": nodeVersions["@cspell/dict-ru_ru"].version,
  cspell: nodeVersions["cspell"].version,
} as const;
