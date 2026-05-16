import "dotenv/config";
import { serve } from "@hono/node-server";
import { createHttpApp } from "./http/app.js";
import { createContainerFromEnv } from "./infrastructure/container.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const container = createContainerFromEnv(process.env);
const app = createHttpApp(container);

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.info(`API listening on http://localhost:${info.port}`);
  }
);
