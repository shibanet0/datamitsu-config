const ESLINT_TO_OXLINT_PREFIX: [string, string][] = [
  ["@next/next/", "nextjs/"],
  ["@typescript-eslint/", "typescript/"],
  ["import-x/", "import/"],
  ["jsx-a11y-x/", "jsx-a11y/"],
  ["n/", "node/"],
];

// Only the React rules implemented by eslint-plugin-react-hooks share this spelling.
const REACT_HOOK_RULE_NAMES: Record<string, true> = {
  "capitalized-calls": true,
  "error-boundaries": true,
  "exhaustive-deps": true,
  "exhaustive-effect-dependencies": true,
  globals: true,
  hooks: true,
  immutability: true,
  "incompatible-library": true,
  invariant: true,
  "memo-dependencies": true,
  "no-deriving-state-in-effects": true,
  "preserve-manual-memoization": true,
  purity: true,
  refs: true,
  "rule-suppression": true,
  "rules-of-hooks": true,
  "set-state-in-effect": true,
  "set-state-in-render": true,
  "static-components": true,
  syntax: true,
  todo: true,
  "unsupported-syntax": true,
  "use-memo": true,
  "void-use-memo": true,
};

const ESLINT_TO_OXLINT_RULE: Record<string, string> = {
  "@eslint-react/dom-no-dangerously-set-innerhtml": "react/no-danger",
  "@eslint-react/no-array-index-key": "react/no-array-index-key",
  "@eslint-react/no-clone-element": "react/no-clone-element",
  "react-prefer-function-component/react-prefer-function-component":
    "react/prefer-function-component",
  "react-refresh/only-export-components": "react/only-export-components",
  "unicorn/no-for-each": "unicorn/no-array-for-each",
};

export function toESLintRuleName(name: string): string {
  if (name.startsWith("react/") && REACT_HOOK_RULE_NAMES[name.slice(6)] === true) {
    return `react-hooks/${name.slice(6)}`;
  }

  for (const [eslintPrefix, oxlintPrefix] of ESLINT_TO_OXLINT_PREFIX) {
    if (name.startsWith(oxlintPrefix)) {
      return eslintPrefix + name.slice(oxlintPrefix.length);
    }
  }

  return name;
}

export function toOxlintRuleName(name: string): string {
  const alias = ESLINT_TO_OXLINT_RULE[name];
  if (alias) {
    return alias;
  }

  if (name.startsWith("react-hooks/") && REACT_HOOK_RULE_NAMES[name.slice(12)] === true) {
    return `react/${name.slice(12)}`;
  }

  for (const [eslintPrefix, oxlintPrefix] of ESLINT_TO_OXLINT_PREFIX) {
    if (name.startsWith(eslintPrefix)) {
      return oxlintPrefix + name.slice(eslintPrefix.length);
    }
  }

  return name;
}
