import type { RealtimeEvent } from "@mates/shared";
import type { WebSocket } from "ws";
import type { RealtimeGateway } from "../../application/ports/realtime-gateway.js";

export class InMemoryRealtimeGateway implements RealtimeGateway {
  private readonly connectionsByUserId = new Map<string, Set<WebSocket>>();

  attach(userId: string, socket: WebSocket): void {
    const existingConnections = this.connectionsByUserId.get(userId);
    if (existingConnections !== undefined) {
      existingConnections.add(socket);
    } else {
      this.connectionsByUserId.set(userId, new Set([socket]));
    }

    const cleanup = () => {
      const connections = this.connectionsByUserId.get(userId);
      if (connections === undefined) {
        return;
      }

      connections.delete(socket);
      if (connections.size === 0) {
        this.connectionsByUserId.delete(userId);
      }
    };

    socket.once("close", cleanup);
    socket.once("error", cleanup);
  }

  async publishToUser(userId: string, event: RealtimeEvent): Promise<void> {
    const connections = this.connectionsByUserId.get(userId);
    if (connections === undefined || connections.size === 0) {
      return;
    }

    const payload = JSON.stringify(event);
    for (const socket of connections) {
      if (socket.readyState === socket.OPEN) {
        socket.send(payload);
      }
    }
  }

  async publishToUsers(userIds: string[], event: RealtimeEvent): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];
    await Promise.all(uniqueUserIds.map((userId) => this.publishToUser(userId, event)));
  }
}
