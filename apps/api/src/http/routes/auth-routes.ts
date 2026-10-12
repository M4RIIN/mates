import type { Hono } from "hono";
import {
  appleAuthRequestSchema,
  completeAppleProfileRequestSchema,
  completeGoogleProfileRequestSchema,
  googleAuthRequestSchema,
  loginRequestSchema,
  registerRequestSchema
} from "@mates/shared";
import type { AppContainer } from "../../infrastructure/container.js";
import { AppErrors } from "../../domain/shared/app-error.js";
import { parseJsonBody } from "../validators/parse-request.js";
import type { AppBindings } from "../types.js";

export function registerAuthRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  app.post("/auth/apple/challenge", async (context) => {
    if (!container.auth.appleAuthEnabled) throw AppErrors.forbidden("Apple authentication is disabled");
    context.header("Cache-Control", "no-store");
    return context.json(await container.useCases.appleAuth.createChallenge());
  });
  app.post("/auth/apple", async (context) => {
    if (!container.auth.appleAuthEnabled) throw AppErrors.forbidden("Apple authentication is disabled");
    const body = await parseJsonBody(appleAuthRequestSchema, context);
    context.header("Cache-Control", "no-store");
    return context.json(await container.useCases.appleAuth.execute(body));
  });
  app.post("/auth/apple/complete-profile", async (context) => {
    if (!container.auth.appleAuthEnabled) throw AppErrors.forbidden("Apple authentication is disabled");
    const body = await parseJsonBody(completeAppleProfileRequestSchema, context);
    context.header("Cache-Control", "no-store");
    return context.json(await container.useCases.appleAuth.completeProfile(body), 201);
  });

  app.post("/auth/google", async (context) => {
    if (!container.auth.googleAuthEnabled) {
      throw AppErrors.forbidden("Google authentication is disabled");
    }

    const body = await parseJsonBody(googleAuthRequestSchema, context);
    const response = await container.useCases.authenticateGoogle.execute(body);
    return context.json(response);
  });

  app.post("/auth/google/complete-profile", async (context) => {
    if (!container.auth.googleAuthEnabled) {
      throw AppErrors.forbidden("Google authentication is disabled");
    }

    const body = await parseJsonBody(completeGoogleProfileRequestSchema, context);
    const response = await container.useCases.completeGoogleProfile.execute(body);
    return context.json(response, 201);
  });

  app.post("/auth/register", async (context) => {
    if (!container.auth.passwordAuthEnabled) {
      throw AppErrors.forbidden("Password authentication is disabled");
    }

    const body = await parseJsonBody(registerRequestSchema, context);
    const response = await container.useCases.registerUser.execute(body);
    return context.json(response, 201);
  });

  app.post("/auth/login", async (context) => {
    if (!container.auth.passwordAuthEnabled) {
      throw AppErrors.forbidden("Password authentication is disabled");
    }

    const body = await parseJsonBody(loginRequestSchema, context);
    const response = await container.useCases.loginUser.execute(body);
    return context.json(response);
  });
}
