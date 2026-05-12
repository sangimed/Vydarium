import type { FastifyPluginAsync } from "fastify";
import { loginSchema } from "@vidravault/shared";
import { verifyPassword } from "../lib/crypto.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await app.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      await reply.code(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
      });
      return;
    }

    const token = await reply.jwtSign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    reply.setCookie("vidravault_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: app.config.COOKIE_SECURE,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
        },
      },
    };
  });

  app.post("/logout", async (_request, reply) => {
    reply.clearCookie("vidravault_session", { path: "/" });
    return { data: { ok: true } };
  });

  app.get("/me", { preHandler: app.authenticate }, async (request) => ({
    data: { user: request.authUser },
  }));
};
