import type { Hono } from "hono";
import { addFriendRequestSchema } from "@mates/shared";
import type { AppContainer } from "../../infrastructure/container.js";
import { createAuthMiddleware } from "../middlewares/auth-middleware.js";
import { parseJsonBody, parseParam } from "../validators/parse-request.js";
import type { AppBindings } from "../types.js";
import { z } from "zod";

const idParamSchema = z.string().uuid();

export function registerFriendRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  const auth = createAuthMiddleware(container.tokenService);

  app.post("/friends", auth, async (context) => {
    const body = await parseJsonBody(addFriendRequestSchema, context);
    const request = await container.useCases.addFriend.execute({
      requesterId: context.get("currentUserId"),
      publicTag: body.publicTag
    });

    return context.json(request, 201);
  });

  app.get("/friends", auth, async (context) => {
    const friends = await container.useCases.listFriends.execute(context.get("currentUserId"));
    return context.json(friends);
  });

  app.get("/friends/requests/received", auth, async (context) => {
    const requests = await container.useCases.listReceivedFriendRequests.execute(context.get("currentUserId"));
    return context.json(requests);
  });

  app.post("/friends/requests/:id/accept", auth, async (context) => {
    const friendshipId = parseParam(idParamSchema, context.req.param("id"));
    const friend = await container.useCases.acceptFriendRequest.execute({
      friendshipId,
      userId: context.get("currentUserId")
    });

    return context.json(friend);
  });
}
