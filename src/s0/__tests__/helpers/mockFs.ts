import { vi } from "vitest";

export interface MockFsState {
  accessiblePaths: Set<string>;
  files: Map<string, Buffer | string>;
  removedPaths: Set<string>;
  writtenFiles: Map<string, Buffer | string>;
}

export class MockFsBuilder {
  private state: MockFsState = {
    accessiblePaths: new Set(),
    files: new Map(),
    removedPaths: new Set(),
    writtenFiles: new Map(),
  };

  /**
   * Add a file to the mock filesystem
   */
  addFile(path: string, content: Buffer | string): this {
    this.state.files.set(path, content);
    this.state.accessiblePaths.add(path);
    return this;
  }

  /**
   * Build fs/promises mock
   */
  build() {
    const state = this.state;

    return {
      access: vi.fn(async (path: string) => {
        if (!state.accessiblePaths.has(path)) {
          const error = new Error(
            `ENOENT: no such file or directory, access '${path}'`,
          ) as NodeJS.ErrnoException;
          error.code = "ENOENT";
          throw error;
        }
      }),

      mkdir: vi.fn(async () => {
        // Mock mkdir - always succeeds
      }),

      readFile: vi.fn(async (path: string) => {
        const content = state.files.get(path);
        if (!content) {
          const error = new Error(
            `ENOENT: no such file or directory, open '${path}'`,
          ) as NodeJS.ErrnoException;
          error.code = "ENOENT";
          throw error;
        }
        return content;
      }),

      rm: vi.fn(async (path: string) => {
        state.removedPaths.add(path);
        // Remove all files under this path
        for (const filePath of state.files.keys()) {
          if (filePath.startsWith(path)) {
            state.files.delete(filePath);
            state.accessiblePaths.delete(filePath);
          }
        }
      }),

      unlink: vi.fn(async (path: string) => {
        if (!state.accessiblePaths.has(path)) {
          const error = new Error(
            `ENOENT: no such file or directory, unlink '${path}'`,
          ) as NodeJS.ErrnoException;
          error.code = "ENOENT";
          throw error;
        }
        state.removedPaths.add(path);
        state.files.delete(path);
        state.accessiblePaths.delete(path);
      }),

      writeFile: vi.fn(async (path: string, content: Buffer | string) => {
        state.writtenFiles.set(path, content);
        state.files.set(path, content);
        state.accessiblePaths.add(path);
      }),
    };
  }

  /**
   * Get paths that were removed
   */
  getRemovedPaths(): Set<string> {
    return this.state.removedPaths;
  }

  /**
   * Get the current state
   */
  getState(): MockFsState {
    return this.state;
  }

  /**
   * Get files that were written
   */
  getWrittenFiles(): Map<string, Buffer | string> {
    return this.state.writtenFiles;
  }

  /**
   * Make a path accessible (exists check will pass)
   */
  makeAccessible(path: string): this {
    this.state.accessiblePaths.add(path);
    return this;
  }
}

/**
 * Create a new mock fs builder
 */
export function createMockFs(): MockFsBuilder {
  return new MockFsBuilder();
}
