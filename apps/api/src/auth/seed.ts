import type { PrismaClient } from "@vidravault/db";
import type { AppConfig } from "@vidravault/config";
import { hashPassword } from "../lib/crypto.js";

export async function ensureAdminUser(prisma: PrismaClient, config: AppConfig) {
  const existing = await prisma.user.findUnique({
    where: { email: config.ADMIN_EMAIL },
  });

  if (existing) {
    return existing;
  }

  const passwordHash = await hashPassword(config.ADMIN_PASSWORD);
  return prisma.user.create({
    data: {
      email: config.ADMIN_EMAIL,
      passwordHash,
      displayName: "Vidravault Admin",
      role: "OWNER",
    },
  });
}
