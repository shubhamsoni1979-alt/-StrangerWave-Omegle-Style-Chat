import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "~/types/socket";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: AppSocket | null = null;

/**
 * Returns a lazily-created, app-wide singleton socket connection.
 * Lazy because we don't want to open a connection during SSR or before the
 * user has granted camera/mic permission and accepted the terms gate.
 */
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function getDeviceType(): string {
  return isMobileDevice() ? "mobile" : "desktop";
}

export function useSocket() {
  const config = useRuntimeConfig();

  function connect(): AppSocket {
    if (socketInstance?.connected) return socketInstance;

    let url = getBackendUrl(config.public.backendUrl);
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    console.log("[Socket] Connecting to backend at:", url);

    socketInstance =
      socketInstance ??
      io(url, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
        transports: ["websocket", "polling"],
        timeout: 10000,
        secure: url.startsWith("https://"),
        forceNew: true,
        query: {
          deviceType: getDeviceType(),
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : ""
        },
        ...(isMobileDevice() && {
          pingInterval: 15000,
          pingTimeout: 10000,
          randomizationFactor: 0.1
        })
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
