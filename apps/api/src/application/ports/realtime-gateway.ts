import type { RealtimeEvent } from "@mates/shared";

export interface RealtimeGateway {
  publishToUser(userId: string, event: RealtimeEvent): Promise<void>;
  publishToUsers(userIds: string[], event: RealtimeEvent): Promise<void>;
}
