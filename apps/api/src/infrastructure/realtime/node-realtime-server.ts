import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import type { AppContainer } from "../container.js";
import { logger, serializeError } from "../logger.js";
import { WebSocketServer, type WebSocket } from "ws";

function writeUnauthorizedResponse(socket: Socket): void {
  socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
  socket.destroy();
}

function writeNotFoundResponse(socket: Socket): void {
  socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
  socket.destroy();
}

export function createNodeRealtimeServer(container: AppContainer) {
  const server = new WebSocketServer({ noServer: true });

  return {
    async handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer): Promise<void> {
      try {
        const requestUrl = new URL(request.url ?? "/", "http://localhost");
        if (requestUrl.pathname !== "/realtime") {
          writeNotFoundResponse(socket);
          return;
        }

        const token = requestUrl.searchParams.get("token");
        if (token === null || token.trim().length === 0) {
          writeUnauthorizedResponse(socket);
          return;
        }

        const payload = await container.tokenService.verify(token);
        server.handleUpgrade(request, socket, head, (websocket: WebSocket) => {
          container.realtime.attach(payload.userId, websocket);
        });
      } catch (error) {
        logger.warn("realtime.upgrade_failed", serializeError(error));
        writeUnauthorizedResponse(socket);
      }
    }
  };
}
