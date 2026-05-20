import type { Hono } from "hono";
import { placeSearchQuerySchema } from "@mates/shared";
import type { AppContainer } from "../../infrastructure/container.js";
import { parseQuery } from "../validators/parse-request.js";
import type { AppBindings } from "../types.js";

export function registerPlaceRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  app.get("/places/search", async (context) => {
    const query = parseQuery(placeSearchQuerySchema, context.req.query());
    const places = await container.useCases.searchPlaces.execute(query.q);

    return context.json({ places });
  });
}
