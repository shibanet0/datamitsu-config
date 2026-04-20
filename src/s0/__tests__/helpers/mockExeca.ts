import { vi } from "vitest";

export interface MockExecaResponse {
  error?: Error & { exitCode?: number; stderr?: string; stdout?: string };
  exitCode?: number;
  stderr?: string;
  stdout?: string;
}

export class MockExecaBuilder {
  private defaultResponse: MockExecaResponse = { exitCode: 0, stdout: "" };
  private responses = new Map<string, MockExecaResponse>();

  /**
   * Build the mock function
   */
  build() {
    return vi.fn(async (command: string, args: string[] = []) => {
      const key = this.createKey(command, args);
      const response = this.responses.get(key) || this.defaultResponse;

      if (response.error) {
        throw response.error;
      }

      return {
        command,
        escapedCommand: command,
        exitCode: response.exitCode || 0,
        failed: false,
        isCanceled: false,
        killed: false,
        stderr: response.stderr || "",
        stdout: response.stdout || "",
        timedOut: false,
      } as any;
    });
  }

  /**
   * Mock a datamitsu command
   */
  mockDatamitsuCommand(args: string[], response: MockExecaResponse): this {
    // datamitsu is called via node with the binary path
    return this.mockResponse("node", args, response);
  }

  /**
   * Mock a git command (convenience method)
   */
  mockGitCommand(args: string, response: MockExecaResponse): this {
    return this.mockResponse("git", args.split(" "), response);
  }

  /**
   * Mock a response for a specific command and args combination
   */
  mockResponse(command: string, args: string[], response: MockExecaResponse): this {
    const key = this.createKey(command, args);
    this.responses.set(key, response);
    return this;
  }

  /**
   * Mock a SOPS command
   */
  mockSopsCommand(args: string[], response: MockExecaResponse): this {
    return this.mockResponse("sops", args, response);
  }

  /**
   * Mock the tty command
   */
  mockTtyCommand(response: MockExecaResponse = { exitCode: 0, stdout: "/dev/ttys001" }): this {
    return this.mockResponse("tty", [], response);
  }

  /**
   * Set default response for unmocked commands
   */
  setDefaultResponse(response: MockExecaResponse): this {
    this.defaultResponse = response;
    return this;
  }

  private createKey(command: string, args: string[]): string {
    // Normalize command path for datamitsu binary
    const normalizedCommand = command.includes("datamitsu.js") ? "datamitsu" : command;
    return `${normalizedCommand}:${args.join(" ")}`;
  }
}

/**
 * Create a new mock execa builder
 */
export function createMockExeca(): MockExecaBuilder {
  return new MockExecaBuilder();
}
