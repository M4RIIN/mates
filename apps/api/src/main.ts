import "dotenv/config";
import { serve } from "@hono/node-server";
import { createHttpApp } from "./http/app.js";
import { createContainerFromEnv } from "./infrastructure/container.js";
import { logger, serializeError } from "./infrastructure/logger.js";

function exitAfterFatalError(): void {
  process.exitCode = 1;
  setImmediate(() => process.exit(1));
}

process.on("uncaughtException", (error) => {
  logger.error("runtime.uncaught_exception", serializeError(error));
  exitAfterFatalError();
});

process.on("unhandledRejection", (reason) => {
  logger.error("runtime.unhandled_rejection", serializeError(reason));
  exitAfterFatalError();
});

try {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT environment variable: ${process.env.PORT}`);
  }

  const container = createContainerFromEnv(process.env);
  const app = createHttpApp(container);
  const server = serve(
    {
      fetch: app.fetch,
      port
    },
    (info) => {
      logger.info("runtime.started", {
        url: `http://localhost:${info.port}`,
        port: info.port
      });
    }
  );

  server.on("error", (error) => {
    logger.error("runtime.server_error", {
      port,
      ...serializeError(error)
    });
    exitAfterFatalError();
  });
} catch (error) {
  logger.error("runtime.startup_error", serializeError(error));
  exitAfterFatalError();
}
