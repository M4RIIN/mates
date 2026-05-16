import type { Hono } from "hono";
import { addFriendRequestSchema } from "@mates/shared";
import type { AppContainer } from "../../infrastructure/container.js";
import { createAuthMiddleware } from "../middlewares/auth-middleware.js";
import { parseJsonBody } from "../validators/parse-request.js";
import type { AppBindings } from "../types.js";

export function registerFriendRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  const auth = createAuthMiddleware(container.tokenService);

  app.post("/friends", auth, async (context) => {
    const body = await parseJsonBody(addFriendRequestSchema, context);
    const friend = await container.useCases.addFriend.execute({
      requesterId: context.get("currentUserId"),
      publicTag: body.publicTag
    });

    return context.json(friend, 201);
  });

  app.get("/friends", auth, async (context) => {
    const friends = await container.useCases.listFriends.execute(context.get("currentUserId"));
    return context.json(friends);
  });
}
