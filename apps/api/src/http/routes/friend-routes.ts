import type { Hono } from "hono";
import { addFriendRequestSchema, createFriendGroupRequestSchema, updateFriendGroupMembersRequestSchema } from "@mates/shared";
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

  app.get("/friend-groups", auth, async (context) => {
    const groups = await container.useCases.listFriendGroups.execute(context.get("currentUserId"));
    return context.json(groups);
  });

  app.post("/friend-groups", auth, async (context) => {
    const body = await parseJsonBody(createFriendGroupRequestSchema, context);
    const group = await container.useCases.createFriendGroup.execute({
      ownerId: context.get("currentUserId"),
      name: body.name,
      memberUserIds: body.memberUserIds
    });

    return context.json(group, 201);
  });

  app.post("/friend-groups/:id/members", auth, async (context) => {
    const groupId = parseParam(idParamSchema, context.req.param("id"));
    const body = await parseJsonBody(updateFriendGroupMembersRequestSchema, context);
    const group = await container.useCases.updateFriendGroupMembers.execute({
      ownerId: context.get("currentUserId"),
      groupId,
      memberUserIds: body.memberUserIds
    });

    return context.json(group);
  });

  app.get("/friends/requests/received", auth, async (context) => {
    const requests = await container.useCases.listReceivedFriendRequests.execute(context.get("currentUserId"));
    return context.json(requests);
  });

  app.get("/friends/requests/sent", auth, async (context) => {
    const requests = await container.useCases.listSentFriendRequests.execute(context.get("currentUserId"));
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
