import type { Hono } from "hono";
import { registerPushTokenRequestSchema } from "@mates/shared";
import type { AppContainer } from "../../infrastructure/container.js";
import { createAuthMiddleware } from "../middlewares/auth-middleware.js";
import { parseJsonBody } from "../validators/parse-request.js";
import type { AppBindings } from "../types.js";

export function registerMeRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  const auth = createAuthMiddleware(container.tokenService);

  app.get("/me", auth, async (context) => {
    const user = await container.useCases.getCurrentUser.execute(context.get("currentUserId"));
    return context.json(user);
  });

  app.post("/me/push-token", auth, async (context) => {
    const body = await parseJsonBody(registerPushTokenRequestSchema, context);
    await container.useCases.registerPushToken.execute({
      userId: context.get("currentUserId"),
      token: body.token,
      platform: body.platform
    });

    return context.json({ ok: true });
  });
}
