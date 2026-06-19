import { app } from "./app";
import { pool } from "./config/db";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const server = app.listen(env.PORT, () => {
  logger.info("Backend server started", {
    port: env.PORT,
    environment: env.NODE_ENV
  });
});

const shutdown = async (signal: string): Promise<void> => {
  logger.warn("Shutdown signal received", { signal });
  server.close(async () => {
    await pool.end();
    logger.info("Backend server stopped");
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
