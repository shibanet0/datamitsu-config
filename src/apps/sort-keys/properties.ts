/**
 * Alphabetical key sorting for `.properties`, done on the text rather than through a data model.
 *
 * The previous sorter piped the file through YAML (`yq -p props -o props 'sort_keys(..)'`), and
 * that round trip is lossy: YAML reads `a.b` as `b` nested under `a`, so a file holding both
 * `a.b=hello` and `a=world` came back as `a = world` alone — one line silently gone. Java
 * properties has no nesting; a dot is an ordinary character in a key.
 *
 * So nothing here parses values. A record is "whatever comment and blank lines precede a key line,
 * plus that key line and its continuations", records are ordered by key, and every byte of each
 * record is written back untouched. What cannot be lost this way: escapes, duplicate keys, unicode
 * escapes, `:` or space as the separator, trailing whitespace inside a value.
 */

interface PropertyRecord {
  /**
   * The key, for ordering.
   */
  key: string;
  /**
   * The lines of this record, verbatim: leading comments and blanks, then the key line.
   */
  lines: string[];
}

const ESCAPES: Readonly<globalThis.Record<string, string>> = { f: "\f", n: "\n", r: "\r", t: "\t" };

/**
 * A line that continues onto the next one — an odd number of trailing backslashes.
 *
 * The carriage return has to come off first: the file is split on `\n`, so in a CRLF file every
 * line ends with one and the backslash is never last. Without that, a continued value in a CRLF
 * file read as two records and sorting moved the continuation away from its key — measured on
 * `a=one \`, ` zzz`, `b=2`, which came back with `b=2` in the middle of `a`'s value.
 */
const isContinuation = (line: string | undefined): boolean => {
  const match = line === undefined ? null : /(\\*)$/.exec(line.replace(/\r$/, ""));

  return match !== null && (match[1]?.length ?? 0) % 2 === 1;
};

const isBlankOrComment = (line: string): boolean => /^\s*([#!].*)?$/.test(line);

/**
 * The key a line declares, decoded the way a properties reader decodes it.
 *
 * Both halves matter for ordering, and a regular expression got both wrong. The separator is the
 * first unescaped `=`, `:` or whitespace, and "unescaped" counts backslashes rather than looking at
 * the one before it: in `a\\=z` the pair is an escaped backslash, so the `=` _is_ the separator and
 * the key is `a\`. The key is then unescaped, `\uXXXX` included, because `\u0061=old` and `a=new`
 * declare the same key — and if the two sort apart, the file's last-wins order changes and the
 * value a reader ends up with changes with it.
 *
 * Sorting equal keys keeps their relative order, because `Array.prototype.sort` is stable: two
 * declarations of one key stay in the order that decides which of them wins.
 */
const keyOf = (line: string): string => {
  let key = "";
  let index = 0;

  while (index < line.length && /\s/.test(line[index] ?? "")) {
    index += 1;
  }

  for (; index < line.length; index += 1) {
    const character = line[index] ?? "";

    if (character === "\\") {
      const escaped = line[index + 1];

      if (escaped === undefined) {
        break;
      }

      if (escaped === "u") {
        const codePoint = Number.parseInt(line.slice(index + 2, index + 6), 16);

        key += Number.isNaN(codePoint) ? "u" : String.fromCodePoint(codePoint);
        index += 5;
        continue;
      }

      key += ESCAPES[escaped] ?? escaped;
      index += 1;
      continue;
    }

    if (character === "=" || character === ":" || /\s/.test(character)) {
      break;
    }

    key += character;
  }

  return key;
};

/**
 * Returns the file with its records ordered by key, or the original text when there is nothing to
 * reorder. Trailing comments and blank lines — the ones that follow the last key — stay at the end,
 * where their author put them.
 */
export const sortProperties = (source: string): string => {
  const hadFinalNewline = source.endsWith("\n");
  const lines = source.split("\n");

  if (hadFinalNewline) {
    lines.pop();
  }

  const records: PropertyRecord[] = [];
  let pending: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (isBlankOrComment(line)) {
      pending.push(line);
      continue;
    }

    const body = [line];

    while (isContinuation(lines[index]) && index + 1 < lines.length) {
      index += 1;
      body.push(lines[index] ?? "");
    }

    records.push({ key: keyOf(line), lines: [...pending, ...body] });
    pending = [];
  }

  if (records.length < 2) {
    return source;
  }

  /**
   * A file whose last line is itself a continuation is truncated — the value it promises is not
   * there. Sorting it would move the next key into that dangling value: `z=first` followed by
   * `a=last\` came back as `a=last\` followed by `z=first`, and `z` stopped being a key at all. So
   * a file that ends mid-value is left exactly as it is.
   */
  if (isContinuation(lines.at(-1))) {
    return source;
  }

  const sorted = [...records].sort((left, right) => left.key.localeCompare(right.key, "en"));
  const result = [...sorted.flatMap((record) => record.lines), ...pending].join("\n");
  const text = hadFinalNewline ? `${result}\n` : result;

  return text === source ? source : text;
};
