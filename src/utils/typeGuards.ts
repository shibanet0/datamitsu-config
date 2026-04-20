/**
 * Type guards for safe error handling with unknown types
 * @module utils/typeGuards
 */

/**
 * Type guard for objects with message property
 * Useful for error-like objects that may not be Error instances
 */
export const hasMessage = (error: unknown): error is { message: string } => {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
};

/**
 * Type guard for execa command errors
 * Execa throws errors with exitCode, stderr, stdout properties
 */
export const isExecaError = (
  error: unknown,
): error is {
  exitCode?: number;
  message: string;
  stderr?: string;
  stdout?: string;
} => {
  return (
    typeof error === "object" &&
    error !== null &&
    ("exitCode" in error || "stderr" in error || "stdout" in error)
  );
};
