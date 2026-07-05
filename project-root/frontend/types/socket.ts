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
  "find-partner": (payload?: { name: string; country: string; flag: string }) => void;
  "next-partner": () => void;
  "leave-chat": () => void;

  offer: (payload: { sdp: RTCSessionDescriptionLike }) => void;
  answer: (payload: { sdp: RTCSessionDescriptionLike }) => void;
  "ice-candidate": (payload: { candidate: RTCIceCandidateLike }) => void;

  "send-message": (payload: { text: string }) => void;
  typing: (payload: { isTyping: boolean }) => void;

  "report-partner": (payload: { reason: string }) => void;

  // Group call events
  "join-group-room": (payload: { roomCode: string }) => void;
  "leave-group-room": () => void;
  "group-offer": (payload: { to: string; sdp: RTCSessionDescriptionLike }) => void;
  "group-answer": (payload: { to: string; sdp: RTCSessionDescriptionLike }) => void;
  "group-ice-candidate": (payload: { to: string; candidate: RTCIceCandidateLike }) => void;
  "send-group-message": (payload: { text: string }) => void;
}

export interface ServerToClientEvents {
  "queue-joined": () => void;
  "partner-found": (payload: { 
    roomId: string; 
    initiator: boolean; 
    partner?: { name: string; country: string; flag: string }
  }) => void;
  "partner-left": (payload: { reason: PartnerLeftReason }) => void;

  offer: (payload: { sdp: RTCSessionDescriptionLike }) => void;
  answer: (payload: { sdp: RTCSessionDescriptionLike }) => void;
  "ice-candidate": (payload: { candidate: RTCIceCandidateLike }) => void;

  "receive-message": (payload: { text: string; at: number }) => void;
  typing: (payload: { isTyping: boolean }) => void;

  "rate-limited": (payload: { event: string; retryAfterMs: number }) => void;
  "error-message": (payload: { message: string }) => void;

  // Group call events
  "user-id": (payload: { userId: string }) => void;
  "user-joined-group": (payload: { socketId: string; userId: string }) => void;
  "user-left-group": (payload: { socketId: string }) => void;
  "group-room-members": (payload: { members: { socketId: string; userId: string }[] }) => void;
  "group-offer": (payload: { from: string; sdp: RTCSessionDescriptionLike }) => void;
  "group-answer": (payload: { from: string; sdp: RTCSessionDescriptionLike }) => void;
  "group-ice-candidate": (payload: { from: string; candidate: RTCIceCandidateLike }) => void;
  "receive-group-message": (payload: { fromSocketId: string; fromUserId: string; text: string; at: number }) => void;
  "incoming-group-call": (payload: { roomCode: string }) => void;
  "online-count": (payload: { count: number }) => void;
}
