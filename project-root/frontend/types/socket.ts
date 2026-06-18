export interface RTCSessionDescriptionLike {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp?: string;
}

export interface RTCIceCandidateLike {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export type PartnerLeftReason = "next" | "disconnect" | "left" | "report";

export interface ClientToServerEvents {
  "find-partner": () => void;
  "next-partner": () => void;
  "leave-chat": () => void;

  offer: (payload: { sdp: RTCSessionDescriptionLike }) => void;
  answer: (payload: { sdp: RTCSessionDescriptionLike }) => void;
  "ice-candidate": (payload: { candidate: RTCIceCandidateLike }) => void;

  "send-message": (payload: { text: string }) => void;
  typing: (payload: { isTyping: boolean }) => void;

  "report-partner": (payload: { reason: string }) => void;
}

export interface ServerToClientEvents {
  "queue-joined": () => void;
  "partner-found": (payload: { roomId: string; initiator: boolean }) => void;
  "partner-left": (payload: { reason: PartnerLeftReason }) => void;

  offer: (payload: { sdp: RTCSessionDescriptionLike }) => void;
  answer: (payload: { sdp: RTCSessionDescriptionLike }) => void;
  "ice-candidate": (payload: { candidate: RTCIceCandidateLike }) => void;

  "receive-message": (payload: { text: string; at: number }) => void;
  typing: (payload: { isTyping: boolean }) => void;

  "rate-limited": (payload: { event: string; retryAfterMs: number }) => void;
  "error-message": (payload: { message: string }) => void;
}
