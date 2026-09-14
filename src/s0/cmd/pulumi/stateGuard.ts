import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function backupPlaintext(plaintextFile: string, content: Buffer): Promise<string> {
  const dir = path.join(getStateGuardDir(), "backups");
  await ensurePrivateDir(dir);

  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const backup = path.join(dir, `${keyFor(plaintextFile)}.${timestamp}.${crypto.randomUUID()}`);
  await fs.writeFile(backup, content, { flag: "wx", mode: 0o600 });
  return backup;
}

export async function clearDecryptConflict(plaintextFile: string): Promise<void> {
  await fs.rm(conflictMarkerPath(plaintextFile), { force: true });
}

/**
 * Backups and conflict markers live in the user cache, never next to the state: files beside
 * `.pulumi` state are not covered by a consumer's ignore rules for plaintext, so staging everything
 * would publish them unencrypted.
 */
export function getStateGuardDir(): string {
  const cacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  return path.join(cacheHome, "pulumi-sops");
}

export async function hasDecryptConflict(plaintextFile: string): Promise<boolean> {
  try {
    await fs.stat(conflictMarkerPath(plaintextFile));
    return true;
  } catch {
    return false;
  }
}

/**
 * Recorded when decryption refuses to replace a plaintext that differs from its encrypted file.
 * Until it is resolved, encryption must not run for that file: the plaintext may be the older side
 * (a pull brought a newer encrypted file), and encrypting it would overwrite the newer state.
 */
export async function markDecryptConflict(plaintextFile: string): Promise<void> {
  const marker = conflictMarkerPath(plaintextFile);
  await ensurePrivateDir(path.dirname(marker));
  await fs.writeFile(
    marker,
    `${JSON.stringify({ file: path.resolve(plaintextFile), markedAt: new Date().toISOString() })}\n`,
    { mode: 0o600 },
  );
}

function conflictMarkerPath(plaintextFile: string): string {
  return path.join(getStateGuardDir(), "conflicts", keyFor(plaintextFile));
}

async function ensurePrivateDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { mode: 0o700, recursive: true });
}

function keyFor(plaintextFile: string): string {
  const absolute = path.resolve(plaintextFile);
  const hash = crypto.createHash("sha256").update(absolute).digest("hex").slice(0, 16);
  return `${hash}-${path.basename(absolute)}`;
}
