import { execa } from "execa";

export async function getGPGTTY(): Promise<string> {
  // Set GPG_TTY - critical for GPG to work properly
  try {
    const { stdout: ttyPath } = await execa("tty", [], {
      stdio: ["inherit", "pipe", "pipe"],
    });
    return ttyPath.trim();
  } catch {
    // Fallback to /dev/tty if tty command fails
    return "/dev/tty";
  }
}
