import { createHash } from "crypto";

export function computePasswordSessionVersion(
  passwordHash: string | null | undefined
): string {
  if (!passwordHash) return "no-password";
  return createHash("sha256").update(passwordHash).digest("hex");
}
