import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const isVercel = process.env.VERCEL === "1";

if (!isVercel) {
  const server = app.listen(env.PORT, () => {
    logger.info("Backend server started", {
      port: env.PORT,
      environment: env.NODE_ENV
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.warn("Shutdown signal received", { signal });
    server.close(async () => {
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
} else {
  logger.info("Running on Vercel (serverless mode)", {
    environment: env.NODE_ENV
  });
}
