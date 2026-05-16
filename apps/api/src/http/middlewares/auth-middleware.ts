import { createMiddleware } from "hono/factory";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { TokenService } from "../../application/ports/token-service.js";
import type { AppBindings } from "../types.js";

export function createAuthMiddleware(tokenService: TokenService) {
  return createMiddleware<AppBindings>(async (context, next) => {
    const authorization = context.req.header("authorization");
    if (authorization === undefined || !authorization.startsWith("Bearer ")) {
      throw AppErrors.unauthorized();
    }

    const token = authorization.slice("Bearer ".length);
    const payload = await tokenService.verify(token);
    context.set("currentUserId", payload.userId);
    await next();
  });
}
