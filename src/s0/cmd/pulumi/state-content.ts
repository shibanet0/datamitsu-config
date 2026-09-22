import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

/**
 * Whether two serialized forms describe the same state, ignoring formatting only.
 *
 * SOPS re-serializes what it decrypts, so byte equality would report a difference for every file
 * whose indentation differs from Pulumi's. YAML goes through a lossless round trip instead:
 * integers stay exact, `.nan` and `null` stay distinct, and key order still counts, which only ever
 * errs towards reporting a difference.
 */
export function isSameStateContent(
  left: Buffer | string,
  right: Buffer | string,
  fileType: "json" | "yaml",
): boolean {
  const leftText = left.toString();
  const rightText = right.toString();

  if (fileType === "json") {
    return (
      stripInsignificantJsonWhitespace(leftText) === stripInsignificantJsonWhitespace(rightText)
    );
  }

  try {
    return canonicalYaml(leftText) === canonicalYaml(rightText);
  } catch {
    return leftText === rightText;
  }
}

/**
 * Drops whitespace outside JSON strings and keeps every other character as is.
 *
 * Parsing and re-serializing would be simpler but is lossy for Pulumi state: it rounds integers
 * beyond 2^53. Array order carries meaning in a checkpoint (dependencies must precede dependents),
 * so two documents are only equal when their token streams are; sorting resources for comparison
 * would let a topologically invalid encrypted file look unchanged and never be repaired.
 *
 * Self-contained on purpose: `encryptState` embeds it into the generated SOPS editor script via
 * `String()`.
 */
export function stripInsignificantJsonWhitespace(text: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
      result += char;
    } else if (char !== " " && char !== "\n" && char !== "\r" && char !== "\t") {
      result += char;
    }
  }

  return result;
}

function canonicalYaml(text: string): string {
  return stringifyYaml(parseYaml(text, { intAsBigInt: true }));
}
