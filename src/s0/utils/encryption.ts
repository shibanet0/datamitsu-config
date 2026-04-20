import type { BinaryLike, CipherGCMTypes } from "node:crypto";

export type { CipherGCMTypes } from "node:crypto";

import type util from "node:util";

export type CryptoModule = typeof crypto;

import type crypto from "node:crypto";

export interface UtilModule {
  promisify: typeof util.promisify;
}

interface EncryptorConfig {
  algorithm?: CipherGCMTypes;
  authTagLength?: number;
  ivLength?: number;
  keyLength?: number;
  saltLength?: number;
}

export class Encryptor {
  private readonly algorithm: CipherGCMTypes;
  private readonly authTagLength: number;

  private readonly crypto: CryptoModule;
  private readonly ivLength: number;
  private readonly keyLength: number;
  private readonly saltLength: number;
  private readonly scryptAsync: (
    password: BinaryLike,
    salt: BinaryLike,
    keylen: number,
  ) => Promise<Buffer>;

  constructor(cryptoModule: CryptoModule, utilModule: UtilModule, config: EncryptorConfig = {}) {
    this.crypto = cryptoModule;
    this.scryptAsync = utilModule.promisify(cryptoModule.scrypt);

    this.algorithm = config.algorithm ?? "aes-256-gcm";
    this.keyLength = config.keyLength ?? 32;
    this.ivLength = config.ivLength ?? 16;
    this.saltLength = config.saltLength ?? 32;
    this.authTagLength = config.authTagLength ?? 16;
  }

  async decrypt(encryptedBuffer: Buffer, key: Buffer): Promise<Buffer> {
    if (!Buffer.isBuffer(encryptedBuffer)) {
      throw new TypeError("Encrypted input must be a Buffer");
    }
    if (!Buffer.isBuffer(key) || key.length !== this.keyLength) {
      throw new TypeError(`Key must be a ${this.keyLength}-byte Buffer`);
    }

    const minLength = this.saltLength + this.ivLength + this.authTagLength + 1;
    if (encryptedBuffer.length < minLength) {
      throw new RangeError("Invalid encrypted data");
    }

    let offset = 0;
    const salt = encryptedBuffer.subarray(offset, offset + this.saltLength);
    offset += this.saltLength;
    const iv = encryptedBuffer.subarray(offset, offset + this.ivLength);
    offset += this.ivLength;
    const authTag = encryptedBuffer.subarray(offset, offset + this.authTagLength);
    offset += this.authTagLength;
    const encrypted = encryptedBuffer.subarray(offset);

    const derivedKey = (await this.scryptAsync(key, salt, this.keyLength)) as Buffer;

    const decipher = this.crypto.createDecipheriv(this.algorithm, derivedKey, iv, {
      authTagLength: this.authTagLength,
    });
    decipher.setAuthTag(authTag);

    try {
      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch {
      throw new Error("Decryption failed: invalid key or corrupted data");
    }
  }

  async encrypt(buffer: Buffer, key: Buffer): Promise<Buffer> {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError("Input must be a Buffer");
    }
    if (!Buffer.isBuffer(key) || key.length !== this.keyLength) {
      throw new TypeError(`Key must be a ${this.keyLength}-byte Buffer`);
    }

    const salt = this.crypto.randomBytes(this.saltLength);
    const derivedKey = (await this.scryptAsync(key, salt, this.keyLength)) as Buffer;
    const iv = this.crypto.randomBytes(this.ivLength);

    const cipher = this.crypto.createCipheriv(this.algorithm, derivedKey, iv, {
      authTagLength: this.authTagLength,
    });
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, authTag, encrypted]);
  }

  generateKey(): Buffer {
    return this.crypto.randomBytes(this.keyLength);
  }
}
