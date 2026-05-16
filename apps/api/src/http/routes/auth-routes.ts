import type { Hono } from "hono";
import { loginRequestSchema, registerRequestSchema } from "@mates/shared";
import type { AppContainer } from "../../infrastructure/container.js";
import { parseJsonBody } from "../validators/parse-request.js";
import type { AppBindings } from "../types.js";

export function registerAuthRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  app.post("/auth/register", async (context) => {
    const body = await parseJsonBody(registerRequestSchema, context);
    const response = await container.useCases.registerUser.execute(body);
    return context.json(response, 201);
  });

  app.post("/auth/login", async (context) => {
    const body = await parseJsonBody(loginRequestSchema, context);
    const response = await container.useCases.loginUser.execute(body);
    return context.json(response);
  });
}
