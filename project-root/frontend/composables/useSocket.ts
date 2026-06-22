import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "~/types/socket";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: AppSocket | null = null;

/**
 * Returns a lazily-created, app-wide singleton socket connection.
 * Lazy because we don't want to open a connection during SSR or before the
 * user has granted camera/mic permission and accepted the terms gate.
 */
export function useSocket() {
  const config = useRuntimeConfig();

  function connect(): AppSocket {
    if (socketInstance?.connected) return socketInstance;

    let url = getBackendUrl(config.public.backendUrl);
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    socketInstance =
      socketInstance ??
      io(url, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

    if (!socketInstance.connected) socketInstance.connect();
    return socketInstance;
  }

  function disconnect(): void {
    socketInstance?.disconnect();
  }

  function getSocket(): AppSocket | null {
    return socketInstance;
  }

  return { connect, disconnect, getSocket };
}
