import { buildServer } from "./server.js";

const app = await buildServer();

try {
  await app.listen({
    host: app.config.API_HOST,
    port: app.config.API_PORT,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
