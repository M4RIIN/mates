import type { Hono } from "hono";
import { createInvitationRequestSchema, respondToInvitationRequestSchema } from "@mates/shared";
import { z } from "zod";
import type { AppContainer } from "../../infrastructure/container.js";
import { createAuthMiddleware } from "../middlewares/auth-middleware.js";
import { parseJsonBody, parseParam } from "../validators/parse-request.js";
import type { AppBindings } from "../types.js";

const idParamSchema = z.string().uuid();

export function registerInvitationRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  const auth = createAuthMiddleware(container.tokenService);

  app.post("/invitations", auth, async (context) => {
    const body = await parseJsonBody(createInvitationRequestSchema, context);
    const invitation = await container.useCases.sendInvitationToFriends.execute({
      creatorId: context.get("currentUserId"),
      ...body
    });

    return context.json(invitation, 201);
  });

  app.get("/invitations/received", auth, async (context) => {
    const invitations = await container.useCases.listReceivedInvitations.execute(context.get("currentUserId"));
    return context.json(invitations);
  });

  app.get("/invitations/created", auth, async (context) => {
    const invitations = await container.useCases.listCreatedInvitations.execute(context.get("currentUserId"));
    return context.json(invitations);
  });

  app.get("/invitations/:id", auth, async (context) => {
    const invitationId = parseParam(idParamSchema, context.req.param("id"));
    const invitation = await container.useCases.getInvitationDetails.execute({
      invitationId,
      requesterId: context.get("currentUserId")
    });

    return context.json(invitation);
  });

  app.post("/invitations/:id/respond", auth, async (context) => {
    const invitationId = parseParam(idParamSchema, context.req.param("id"));
    const body = await parseJsonBody(respondToInvitationRequestSchema, context);
    const response = await container.useCases.respondToInvitation.execute({
      invitationId,
      userId: context.get("currentUserId"),
      ...body
    });

    return context.json({
      id: response.id,
      invitationId: response.invitationId,
      userId: response.userId,
      responseStatus: response.responseStatus,
      delayMinutes: response.delayMinutes,
      respondedAt: response.respondedAt?.toISOString() ?? null
    });
  });
}
