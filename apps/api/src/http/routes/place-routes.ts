import type { Hono } from "hono";
import { placeSearchQuerySchema } from "@mates/shared";
import type { PlaceSearchOptions } from "../../application/ports/place-search-port.js";
import type { AppContainer } from "../../infrastructure/container.js";
import { parseQuery } from "../validators/parse-request.js";
import type { AppBindings } from "../types.js";

export function registerPlaceRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  app.get("/places/search", async (context) => {
    const query = parseQuery(placeSearchQuerySchema, context.req.query());
    const options: PlaceSearchOptions = {};
    if (query.countryCode !== undefined) {
      options.countryCode = query.countryCode;
    }
    if (query.limit !== undefined) {
      options.limit = query.limit;
    }
    const places = await container.useCases.searchPlaces.execute(query.q, options);

    return context.json({ places });
  });
}
