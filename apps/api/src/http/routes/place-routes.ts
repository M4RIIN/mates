import type { Hono } from "hono";
import { featuredPlacesQuerySchema, placeSearchQuerySchema } from "@mates/shared";
import type { PlaceSearchOptions } from "../../application/ports/place-search-port.js";
import type { AppContainer } from "../../infrastructure/container.js";
import { parseQuery } from "../validators/parse-request.js";
import type { AppBindings } from "../types.js";

export function registerPlaceRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  app.get("/places/featured", async (context) => {
    const query = parseQuery(featuredPlacesQuerySchema, context.req.query());
    return context.json({ places: await container.useCases.searchPlaces.featured(query.latitude, query.longitude) });
  });
  // Used by installations configured with a client-side geocoding provider.
  app.get("/places/catalog", async (context) => {
    const query = parseQuery(placeSearchQuerySchema, context.req.query());
    return context.json({ places: query.q.length < 3 ? [] : await container.useCases.searchPlaces.catalog(query.q, query.limit ?? 8) });
  });
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
