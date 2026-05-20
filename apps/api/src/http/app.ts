import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { AppError } from "../domain/shared/app-error.js";
import type { AppContainer } from "../infrastructure/container.js";
import { logger, serializeError } from "../infrastructure/logger.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";
import { registerFriendRoutes } from "./routes/friend-routes.js";
import { registerInvitationRoutes } from "./routes/invitation-routes.js";
import { registerMeRoutes } from "./routes/me-routes.js";
import { registerPlaceRoutes } from "./routes/place-routes.js";
import { registerUserRoutes } from "./routes/user-routes.js";
import type { AppBindings } from "./types.js";

function getHttpLogContext(context: Context<AppBindings>, status: number): Record<string, unknown> {
  return {
    method: context.req.method,
    path: context.req.path,
    status,
    requestId: context.req.header("x-request-id")
  };
}

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
  registerPlaceRoutes(app, container);
  registerInvitationRoutes(app, container);

  app.notFound((context) => {
    logger.warn("http.not_found", getHttpLogContext(context, 404));

    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Route not found"
        }
      },
      { status: 404 }
    );
  });

  app.onError((error, context) => {
    if (error instanceof AppError) {
      const log = error.httpStatus >= 500 ? logger.error : logger.warn;
      log("http.error", {
        ...getHttpLogContext(context, error.httpStatus),
        code: error.code,
        message: error.message,
        details: error.details
      });

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

    logger.error("http.error", {
      ...getHttpLogContext(context, 500),
      code: "INTERNAL_SERVER_ERROR",
      ...serializeError(error)
    });

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
