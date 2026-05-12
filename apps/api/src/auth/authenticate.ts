import type { FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@vidravault/db";
import type { AppConfig } from "@vidravault/config";
import { z } from "zod";
import { sha256 } from "../lib/crypto.js";

const authJwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  role: z.string(),
});

export function makeAuthenticate(prisma: PrismaClient, config: AppConfig) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    if (!config.REQUIRE_AUTH) {
      request.authUser = {
        id: "auth-disabled",
        email: "auth-disabled@local",
        role: "OWNER",
        authMode: "disabled",
      };
      return;
    }

    const authorization = request.headers.authorization;
    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice("Bearer ".length).trim();
      const apiTokenUser = await authenticateBearerToken(prisma, config, token);
      if (apiTokenUser) {
        request.authUser = apiTokenUser;
        return;
      }
    }

    const cookieToken = request.cookies.vidravault_session;
    if (!cookieToken) {
      await reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Login required." } });
      return;
    }

    try {
      const rawPayload: unknown = await request.jwtVerify();
      const payload = authJwtPayloadSchema.parse(rawPayload);
      request.authUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        authMode: "session",
      };
    } catch {
      await reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Login required." } });
    }
  };
}

async function authenticateBearerToken(
  prisma: PrismaClient,
  config: AppConfig,
  token: string,
): Promise<FastifyRequest["authUser"] | null> {
  if (
    config.MCP_API_TOKEN &&
    config.MCP_API_TOKEN !== "change-me-for-local-mcp-use" &&
    token === config.MCP_API_TOKEN
  ) {
    return {
      id: "mcp-token",
      email: "mcp@local",
      role: "OWNER",
      authMode: "mcp-token",
    };
  }

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });

  if (!apiToken || apiToken.revokedAt || (apiToken.expiresAt && apiToken.expiresAt < new Date())) {
    return null;
  }

  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: apiToken.user.id,
    email: apiToken.user.email,
    role: apiToken.user.role,
    authMode: "api-token",
  };
}
