import { vi } from "vitest";

import type { CryptoModule } from "../../utils/encryption.js";

export class MockCryptoBuilder {
  private randomBytesIndex = 0;
  private randomBytesValues: Buffer[] = [];

  /**
   * Add a predetermined value for randomBytes
   */
  addRandomBytesValue(value: Buffer): this {
    this.randomBytesValues.push(value);
    return this;
  }

  /**
   * Build the mock crypto module
   * Note: This only mocks randomBytes for deterministic testing
   * Other crypto functions use the real implementation
   */
  build(realCrypto: CryptoModule): Partial<CryptoModule> {
    const getMockRandomBytes = (size: number) => {
      // If we have predetermined values, use them
      if (this.randomBytesIndex < this.randomBytesValues.length) {
        const value = this.randomBytesValues[this.randomBytesIndex];
        this.randomBytesIndex++;
        if (!value) {
          throw new Error(
            `Mock randomBytes: value at index ${this.randomBytesIndex - 1} is undefined`,
          );
        }
        if (value.length !== size) {
          throw new Error(`Mock randomBytes: expected ${size} bytes, got ${value.length}`);
        }
        return value;
      }
      // Otherwise use real randomBytes
      return realCrypto.randomBytes(size);
    };

    return {
      ...realCrypto,
      randomBytes: vi.fn(getMockRandomBytes) as typeof realCrypto.randomBytes,
    };
  }

  /**
   * Reset the random bytes index
   */
  reset(): void {
    this.randomBytesIndex = 0;
  }
}

/**
 * Create a new mock crypto builder
 */
export function createMockCrypto(): MockCryptoBuilder {
  return new MockCryptoBuilder();
}
