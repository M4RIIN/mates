import { Hono } from "hono";
import { cors } from "hono/cors";
import { AppError } from "../domain/shared/app-error.js";
import type { AppContainer } from "../infrastructure/container.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";
import { registerFriendRoutes } from "./routes/friend-routes.js";
import { registerInvitationRoutes } from "./routes/invitation-routes.js";
import { registerMeRoutes } from "./routes/me-routes.js";
import { registerUserRoutes } from "./routes/user-routes.js";
import type { AppBindings } from "./types.js";

export function createHttpApp(container: AppContainer): Hono<AppBindings> {
  const app = new Hono<AppBindings>();

  app.use(
    "*",
    cors({
      origin: "*",
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "OPTIONS"]
    })
  );

  app.get("/health", (context) => context.json({ ok: true }));

  registerAuthRoutes(app, container);
  registerMeRoutes(app, container);
  registerUserRoutes(app, container);
  registerFriendRoutes(app, container);
  registerInvitationRoutes(app, container);

  app.onError((error) => {
    if (error instanceof AppError) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        },
        { status: error.httpStatus }
      );
    }

    console.error(error);
    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error"
        }
      },
      { status: 500 }
    );
  });

  return app;
}
