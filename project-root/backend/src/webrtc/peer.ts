/**
 * The actual RTCPeerConnection objects live in the browser (frontend/composables/useWebRTC.ts).
 * The server's only WebRTC-related job is telling clients which ICE servers
 * to use, so TURN credentials never have to be hardcoded into the frontend
 * bundle and can be rotated via environment variables alone.
 */

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export function getIceServers(): IceServerConfig[] {
  const servers: IceServerConfig[] = [
    { urls: "stun:stun.l.google.com:19302" },
  ];

  const turnServer = process.env.TURN_SERVER?.trim();
  const turnUsername = process.env.TURN_USERNAME?.trim();
  const turnPassword = process.env.TURN_PASSWORD?.trim();

  if (turnServer && turnUsername && turnPassword) {
    servers.push({
      urls: turnServer,
      username: turnUsername,
      credential: turnPassword,
    });
  }

  return servers;
}
