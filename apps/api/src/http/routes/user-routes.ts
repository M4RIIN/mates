import type { Hono } from "hono";
import { userSearchQuerySchema } from "@mates/shared";
import type { AppContainer } from "../../infrastructure/container.js";
import { parseQuery } from "../validators/parse-request.js";
import type { AppBindings } from "../types.js";

export function registerUserRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  app.get("/users/search", async (context) => {
    const query = parseQuery(userSearchQuerySchema, context.req.query());
    const user = await container.useCases.searchUserByPublicTag.execute(query.tag);
    return context.json({ user });
  });
}
