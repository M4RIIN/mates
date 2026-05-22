import type { FriendRequestDto } from "@mates/shared";
import type { FriendshipRepository } from "../ports/friendship-repository.js";

export class ListReceivedFriendRequestsUseCase {
  constructor(private readonly friendships: FriendshipRepository) {}

  async execute(userId: string): Promise<FriendRequestDto[]> {
    const requests = await this.friendships.listReceivedPendingRequests(userId);

    return requests.map((request) => ({
      id: request.id,
      requester: request.requester,
      addressee: request.addressee,
      status: request.status,
      createdAt: request.createdAt.toISOString()
    }));
  }
}
