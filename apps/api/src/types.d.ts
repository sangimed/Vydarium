import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      role: string;
    };
    user: {
      sub: string;
      email: string;
      role: string;
    };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: {
      id: string;
      email: string;
      role: string;
      authMode: "session" | "api-token" | "mcp-token" | "disabled";
    };
  }
}
