import { Buffer } from "node:buffer";

/**
 * Incremental tar entry-name parser. Chunks are pushed in; entry names come out via the callback.
 * Handles ustar prefixes, GNU long names ('L'), PAX path records ('x') and GNU base-256 sizes.
 * Content bytes are skipped, never collected (except the small meta entries that carry a path).
 */
export class TarNameParser {
  private buffer = Buffer.alloc(0);
  private readonly onEntry: (name: string) => boolean;
  private pendingLongName: string | undefined;
  private pendingPaxPath: string | undefined;

  private skip = 0; // content bytes (incl. padding) left to discard

  constructor(onEntry: (name: string) => boolean) {
    this.onEntry = onEntry;
  }

  /**
   * Feeds one chunk; returns true once onEntry asked to stop.
   */
  push(chunk: Buffer): boolean {
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
    while (this.consumeSkip() && this.buffer.length >= 512) {
      const header = this.buffer.subarray(0, 512);
      this.buffer = this.buffer.subarray(512);
      if (header.every((byte) => byte === 0)) {
        continue; // end-of-archive padding
      }
      if (this.consumeEntry(header)) {
        return true;
      }
    }
    return false;
  }

  private consumeEntry(header: Buffer): boolean {
    const sizeField = header.toString("ascii", 124, 136).replaceAll("\0", "").trim();
    const size =
      header[124] & 0x80
        ? Number(header.readBigUInt64BE(128)) // GNU base-256 size
        : Number.parseInt(sizeField || "0", 8);
    this.skip = size + ((512 - (size % 512)) % 512);

    const typeflag = String.fromCodePoint(header[156]);
    if (typeflag === "L" || typeflag === "x") {
      // Meta entry whose content carries the NEXT entry's path. Paths are far
      // smaller than a chunk, so requiring the content to be buffered already
      // keeps the parser simple; a torn meta entry fails loudly.
      if (this.buffer.length < size) {
        throw new Error("tar meta entry split across chunks; increase buffering");
      }
      const content = this.buffer.subarray(0, size).toString("utf8");
      if (typeflag === "L") {
        this.pendingLongName = content.replaceAll("\0", "");
      } else {
        const match = /\d+ path=([^\n]*)\n/.exec(content);
        if (match) {
          this.pendingPaxPath = match[1];
        }
      }
      return false;
    }

    let name = header.toString("utf8", 0, 100).replaceAll("\0", "");
    const prefix = header.toString("utf8", 345, 500).replaceAll("\0", "");
    if (prefix) {
      name = `${prefix}/${name}`;
    }
    name = this.pendingLongName ?? this.pendingPaxPath ?? name;
    this.pendingLongName = undefined;
    this.pendingPaxPath = undefined;
    return this.onEntry(name);
  }

  /**
   * Discards pending content bytes; false while more bytes are still owed.
   */
  private consumeSkip(): boolean {
    const consumed = Math.min(this.skip, this.buffer.length);
    this.buffer = this.buffer.subarray(consumed);
    this.skip -= consumed;
    return this.skip === 0;
  }
}
