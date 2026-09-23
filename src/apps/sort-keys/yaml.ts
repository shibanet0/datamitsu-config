/**
 * Alphabetical key sorting for YAML, with the one thing `yq 'sort_keys(..)'` gets wrong.
 *
 * An anchor has to be defined before the alias that refers to it — it is a rule about the order of
 * the document, not about its shape. Sorting keys alphabetically does not know that, so a document
 * declaring `z: &a` and referring to it from `b: *a` comes back with `b` first and stops parsing:
 * `yamllint` then reports `found undeclared alias "a"` on a file the fixer had just written.
 * Reproduced against the pinned `yq`, which is why the sorting moved here.
 *
 * The guard is the whole point of this module: a document that declares an anchor, refers to one,
 * or uses a merge key is **left exactly as it was**. Sorting it correctly would mean topologically
 * ordering anchors before their aliases, which is a different operation from "alphabetical" and one
 * nobody asked for — so the file keeps its author's order, and every other file gets sorted.
 *
 * Comments survive because the sort happens in the `yaml` document AST, where a comment belongs to
 * the node it sits on, rather than through a parse-and-re-emit that drops them.
 */
import { isAlias, isMap, isSeq, type Node, parseAllDocuments, type YAMLMap } from "yaml";

/**
 * What a document has to be free of before its keys may be reordered.
 *
 * The merge key is tested by name rather than through its value: `<<: {b: 2}` merges an inline map
 * and carries no alias at all, so the alias test alone walked straight past it — and a merge
 * decides what the keys around it resolve to, which makes its position part of the document's
 * meaning.
 */
const hasAnchorOrAlias = (node: unknown): boolean => {
  if (node === null || typeof node !== "object") {
    return false;
  }

  const candidate = node as { anchor?: string; items?: unknown[]; key?: unknown; value?: unknown };

  if (isAlias(node as Node) || typeof candidate.anchor === "string" || isMergeKey(candidate.key)) {
    return true;
  }

  if (Array.isArray(candidate.items)) {
    return candidate.items.some((item) => hasAnchorOrAlias(item));
  }

  return hasAnchorOrAlias(candidate.key) || hasAnchorOrAlias(candidate.value);
};

/**
 * `<<`, plain or carrying the merge tag its YAML 1.1 spelling uses.
 */
const isMergeKey = (key: unknown): boolean => {
  if (key === "<<") {
    return true;
  }

  if (key === null || typeof key !== "object") {
    return false;
  }

  const scalar = key as { tag?: string; value?: unknown };

  return scalar.value === "<<" || scalar.tag === "tag:yaml.org,2002:merge";
};

/**
 * Sorts a mapping's keys, then recurses. Sequences keep their order — a list is an order, and
 * reordering `steps:` or `cmds:` would change what the file means rather than how it reads.
 */
const sortNode = (node: unknown): void => {
  if (isMap(node)) {
    const map = node as YAMLMap;

    map.items.sort((left, right) => String(left.key).localeCompare(String(right.key), "en"));

    for (const pair of map.items) {
      sortNode(pair.value);
    }

    return;
  }

  if (isSeq(node)) {
    for (const item of node.items) {
      sortNode(item);
    }
  }
};

/**
 * Returns the sorted document, or the original text when sorting would be unsafe or would change
 * nothing. Unsafe means: it does not parse, or it uses anchors, aliases or merge keys.
 */
export const sortYaml = (source: string): string => {
  /**
   * `intAsBigInt` is not a preference — without it an integer past 2^53 is parsed into a JS number
   * and written back rounded: `b: 9007199254740993` came out as `9007199254740992`, silently, on a
   * file the fixer had just claimed to only reorder. A `BigInt` round-trips exactly, and
   * stringifies without the `n`.
   */
  const documents = parseAllDocuments(source, { intAsBigInt: true, keepSourceTokens: true });

  if (documents.length === 0) {
    return source;
  }

  for (const document of documents) {
    if (document.errors.length > 0 || hasAnchorOrAlias(document.contents)) {
      return source;
    }
  }

  for (const document of documents) {
    sortNode(document.contents);
  }

  const sorted = documents.map((document) => document.toString({ lineWidth: 0 })).join("");

  // A file that is already in order keeps its bytes, so re-running never bumps an mtime or shows up
  // in a diff. The round trip is not byte-stable for every input — where it is not, the formatter
  // that runs after this has the last word anyway.
  return sorted === source ? source : sorted;
};
