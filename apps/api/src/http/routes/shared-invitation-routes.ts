import type { Hono } from "hono";
import { z } from "zod";
import { guestKeySchema, guestRespondRequestSchema } from "@mates/shared";
import type { AppContainer } from "../../infrastructure/container.js";
import type { AppBindings } from "../types.js";
import { createAuthMiddleware } from "../middlewares/auth-middleware.js";
import { parseJsonBody, parseParam } from "../validators/parse-request.js";

const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const idSchema = z.string().uuid();

export function registerSharedInvitationRoutes(app: Hono<AppBindings>, container: AppContainer) {
  const auth = createAuthMiddleware(container.tokenService);
  for (const path of ["/s/*", "/shared-invitations/*", "/invitations/:id/share-link", "/invitations/:id/share-link/*", "/app/s/*"]) {
    app.use(path, async (c, next) => {
      c.header("Cache-Control", "no-store");
      c.header("Referrer-Policy", "no-referrer");
      c.header("X-Robots-Tag", "noindex, nofollow");
      await next();
    });
  }
  app.get("/s/:token", async (c) => {
    const token = parseParam(tokenSchema, c.req.param("token"));
    return c.redirect(`/app/s/${token}`);
  });
  app.get("/shared-invitations/:token", async (c) => c.json(await container.useCases.invitationSharing.getPublic(parseParam(tokenSchema, c.req.param("token")))));
  app.post("/shared-invitations/:token/me", async (c) => {
    const token = parseParam(tokenSchema, c.req.param("token"));
    const body = await parseJsonBody(z.object({ guestKey: guestKeySchema }), c);
    return c.json(await container.useCases.invitationSharing.getResponse(token, body.guestKey));
  });
  app.post("/shared-invitations/:token/respond", async (c) => {
    const token = parseParam(tokenSchema, c.req.param("token"));
    const body = await parseJsonBody(guestRespondRequestSchema, c);
    return c.json(await container.useCases.invitationSharing.respond(token, body));
  });
  app.get("/invitations/:id/share-link", auth, async (c) => c.json(await container.useCases.invitationSharing.getLink(parseParam(idSchema, c.req.param("id")), c.get("currentUserId"))));
  app.post("/invitations/:id/share-link", auth, async (c) => {
    const body = await parseJsonBody(z.object({ showAddress: z.boolean() }), c);
    return c.json(await container.useCases.invitationSharing.enable(parseParam(idSchema, c.req.param("id")), c.get("currentUserId"), body.showAddress));
  });
  app.post("/invitations/:id/share-link/revoke", auth, async (c) => {
    await container.useCases.invitationSharing.revoke(parseParam(idSchema, c.req.param("id")), c.get("currentUserId"));
    return c.json({ ok: true });
  });
}
