export type ConnectionState =
  | "idle" // never started
  | "requesting-media" // asking for camera/mic permission
  | "media-ready" // local stream acquired
  | "queued" // waiting in matchmaking queue
  | "matched" // partner found, negotiating WebRTC
  | "connected" // media flowing both ways
  | "partner-left" // partner disconnected/skipped/reported us
  | "error";

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  at: number;
  from: "me" | "stranger";
}
