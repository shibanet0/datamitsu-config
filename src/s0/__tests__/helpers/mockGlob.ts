import { vi } from "vitest";

export class MockGlobBuilder {
  private defaultFiles: string[] = [];
  private patterns = new Map<string, string[]>();

  /**
   * Build the mock glob function
   */
  build() {
    return vi.fn(async (patterns: readonly string[] | string) => {
      const key = this.createKey(patterns);
      return this.patterns.get(key) || this.defaultFiles;
    });
  }

  /**
   * Mock glob results for a specific pattern or array of patterns
   */
  mockGlobResults(patterns: readonly string[] | string, files: string[]): this {
    const key = this.createKey(patterns);
    this.patterns.set(key, files);
    return this;
  }

  /**
   * Set default files for unmocked patterns
   */
  setDefaultFiles(files: string[]): this {
    this.defaultFiles = files;
    return this;
  }

  private createKey(patterns: readonly string[] | string): string {
    if (Array.isArray(patterns)) {
      return patterns.toSorted().join("|");
    }
    return patterns as string;
  }
}

/**
 * Create a new mock glob builder
 */
export function createMockGlob(): MockGlobBuilder {
  return new MockGlobBuilder();
}
