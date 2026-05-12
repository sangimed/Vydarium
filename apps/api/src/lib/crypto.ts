import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function createOpaqueToken(prefix = "vv"): string {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}
