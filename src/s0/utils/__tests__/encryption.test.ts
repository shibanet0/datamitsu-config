import * as crypto from "node:crypto";
import * as util from "node:util";
import { beforeEach, describe, expect, it } from "vitest";

import { Encryptor } from "../encryption.js";

describe("Encryptor", () => {
  let encryptor: Encryptor;

  beforeEach(() => {
    encryptor = new Encryptor(crypto, util);
  });

  describe("generateKey", () => {
    it("should generate a 32-byte key", () => {
      const key = encryptor.generateKey();

      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    it("should generate unique keys", () => {
      const key1 = encryptor.generateKey();
      const key2 = encryptor.generateKey();

      expect(key1.equals(key2)).toBe(false);
    });

    it("should generate cryptographically random keys", () => {
      const keys = Array.from({ length: 10 }, () => encryptor.generateKey());

      // All keys should be different
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const keyI = keys[i];
          const keyJ = keys[j];
          if (keyI && keyJ) {
            expect(keyI.equals(keyJ)).toBe(false);
          }
        }
      }
    });
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt roundtrip", async () => {
      const plaintext = Buffer.from("Secret data!");
      const key = encryptor.generateKey();

      const encrypted = await encryptor.encrypt(plaintext, key);
      const decrypted = await encryptor.decrypt(encrypted, key);

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    it("should handle large buffers", async () => {
      // 1MB of data
      const plaintext = Buffer.alloc(1024 * 1024, "a");
      const key = encryptor.generateKey();

      const encrypted = await encryptor.encrypt(plaintext, key);
      const decrypted = await encryptor.decrypt(encrypted, key);

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    it("should handle binary data with null bytes", async () => {
      const plaintext = Buffer.from([0x00, 0x01, 0x02, 0xff, 0x00, 0xfe]);
      const key = encryptor.generateKey();

      const encrypted = await encryptor.encrypt(plaintext, key);
      const decrypted = await encryptor.decrypt(encrypted, key);

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    it("should handle UTF-8 text with emojis", async () => {
      const plaintext = Buffer.from("Hello 🌍 World 🚀!");
      const key = encryptor.generateKey();

      const encrypted = await encryptor.encrypt(plaintext, key);
      const decrypted = await encryptor.decrypt(encrypted, key);

      expect(decrypted.toString("utf8")).toBe("Hello 🌍 World 🚀!");
    });

    it("should produce different ciphertext for same plaintext", async () => {
      const plaintext = Buffer.from("Same data");
      const key = encryptor.generateKey();

      const encrypted1 = await encryptor.encrypt(plaintext, key);
      const encrypted2 = await encryptor.encrypt(plaintext, key);

      // Ciphertext should be different due to random IV
      expect(encrypted1.equals(encrypted2)).toBe(false);

      // But both should decrypt to same plaintext
      const decrypted1 = await encryptor.decrypt(encrypted1, key);
      const decrypted2 = await encryptor.decrypt(encrypted2, key);

      expect(decrypted1.equals(plaintext)).toBe(true);
      expect(decrypted2.equals(plaintext)).toBe(true);
    });
  });

  describe("encrypt validation", () => {
    it("should reject non-Buffer input", async () => {
      const key = encryptor.generateKey();

      await expect(encryptor.encrypt("not a buffer" as any, key)).rejects.toThrow(
        "Input must be a Buffer",
      );
    });

    it("should reject non-Buffer key", async () => {
      const plaintext = Buffer.from("data");

      await expect(encryptor.encrypt(plaintext, "not a buffer" as any)).rejects.toThrow(
        "Key must be a 32-byte Buffer",
      );
    });

    it("should reject key with wrong length", async () => {
      const plaintext = Buffer.from("data");
      const wrongKey = Buffer.alloc(16); // Only 16 bytes instead of 32

      await expect(encryptor.encrypt(plaintext, wrongKey)).rejects.toThrow(
        "Key must be a 32-byte Buffer",
      );
    });
  });

  describe("decrypt validation", () => {
    it("should reject non-Buffer input", async () => {
      const key = encryptor.generateKey();

      await expect(encryptor.decrypt("not a buffer" as any, key)).rejects.toThrow(
        "Encrypted input must be a Buffer",
      );
    });

    it("should reject non-Buffer key", async () => {
      const encrypted = Buffer.from("data");

      await expect(encryptor.decrypt(encrypted, "not a buffer" as any)).rejects.toThrow(
        "Key must be a 32-byte Buffer",
      );
    });

    it("should reject key with wrong length", async () => {
      const encrypted = Buffer.from("data");
      const wrongKey = Buffer.alloc(16);

      await expect(encryptor.decrypt(encrypted, wrongKey)).rejects.toThrow(
        "Key must be a 32-byte Buffer",
      );
    });

    it("should reject encrypted data that is too short", async () => {
      const key = encryptor.generateKey();
      const tooShort = Buffer.alloc(10); // Less than minLength (salt + iv + authTag)

      await expect(encryptor.decrypt(tooShort, key)).rejects.toThrow("Invalid encrypted data");
    });

    it("should throw on wrong key", async () => {
      const plaintext = Buffer.from("test data");
      const key1 = encryptor.generateKey();
      const key2 = encryptor.generateKey();

      const encrypted = await encryptor.encrypt(plaintext, key1);

      await expect(encryptor.decrypt(encrypted, key2)).rejects.toThrow(
        "Decryption failed: invalid key or corrupted data",
      );
    });

    it("should throw on corrupted data", async () => {
      const plaintext = Buffer.from("test data");
      const key = encryptor.generateKey();

      const encrypted = await encryptor.encrypt(plaintext, key);

      // Corrupt the ciphertext
      const lastByte = encrypted.at(-1);
      if (lastByte !== undefined) {
        encrypted[encrypted.length - 1] = lastByte ^ 0xff;
      }

      await expect(encryptor.decrypt(encrypted, key)).rejects.toThrow(
        "Decryption failed: invalid key or corrupted data",
      );
    });

    it("should throw on corrupted auth tag", async () => {
      const plaintext = Buffer.from("test data");
      const key = encryptor.generateKey();

      const encrypted = await encryptor.encrypt(plaintext, key);

      // Corrupt the auth tag (located after salt and IV)
      const authTagOffset = 32 + 16; // saltLength + ivLength
      const authTagByte = encrypted.at(authTagOffset);
      if (authTagByte !== undefined) {
        encrypted[authTagOffset] = authTagByte ^ 0xff;
      }

      await expect(encryptor.decrypt(encrypted, key)).rejects.toThrow(
        "Decryption failed: invalid key or corrupted data",
      );
    });

    it("should throw on corrupted IV", async () => {
      const plaintext = Buffer.from("test data");
      const key = encryptor.generateKey();

      const encrypted = await encryptor.encrypt(plaintext, key);

      // Corrupt the IV (located after salt)
      const ivOffset = 32; // saltLength
      const ivByte = encrypted.at(ivOffset);
      if (ivByte !== undefined) {
        encrypted[ivOffset] = ivByte ^ 0xff;
      }

      await expect(encryptor.decrypt(encrypted, key)).rejects.toThrow(
        "Decryption failed: invalid key or corrupted data",
      );
    });
  });

  describe("custom configuration", () => {
    it("should support custom algorithm", async () => {
      const customEncryptor = new Encryptor(crypto, util, {
        algorithm: "aes-128-gcm",
        keyLength: 16,
      });

      const plaintext = Buffer.from("test");
      const key = customEncryptor.generateKey();

      expect(key.length).toBe(16);

      const encrypted = await customEncryptor.encrypt(plaintext, key);
      const decrypted = await customEncryptor.decrypt(encrypted, key);

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    it("should support custom IV length", async () => {
      const customEncryptor = new Encryptor(crypto, util, {
        ivLength: 12,
      });

      const plaintext = Buffer.from("test");
      const key = customEncryptor.generateKey();

      const encrypted = await customEncryptor.encrypt(plaintext, key);
      const decrypted = await customEncryptor.decrypt(encrypted, key);

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    it("should use default values when config not provided", () => {
      const defaultEncryptor = new Encryptor(crypto, util);
      const key = defaultEncryptor.generateKey();

      // Default key length should be 32
      expect(key.length).toBe(32);
    });
  });

  describe("encrypted data structure", () => {
    it("should have correct structure (salt + iv + authTag + encrypted)", async () => {
      const plaintext = Buffer.from("test");
      const key = encryptor.generateKey();

      const encrypted = await encryptor.encrypt(plaintext, key);

      // Default sizes: salt(32) + iv(16) + authTag(16) + encrypted(4+)
      const minSize = 32 + 16 + 16 + plaintext.length;
      expect(encrypted.length).toBeGreaterThanOrEqual(minSize);
    });

    it("should extract salt, iv, and authTag correctly", async () => {
      const plaintext = Buffer.from("test");
      const key = encryptor.generateKey();

      const encrypted1 = await encryptor.encrypt(plaintext, key);
      const encrypted2 = await encryptor.encrypt(plaintext, key);

      // Salt should be different (first 32 bytes)
      const salt1 = encrypted1.subarray(0, 32);
      const salt2 = encrypted2.subarray(0, 32);
      expect(salt1.equals(salt2)).toBe(false);

      // IV should be different (bytes 32-48)
      const iv1 = encrypted1.subarray(32, 48);
      const iv2 = encrypted2.subarray(32, 48);
      expect(iv1.equals(iv2)).toBe(false);
    });
  });
});
