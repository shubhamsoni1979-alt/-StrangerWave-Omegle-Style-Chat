import { useConnectionStore } from "~/stores/connection";
import { useChatStore } from "~/stores/chat";
import { useUserStore } from "~/stores/user";

export function useMatchmaking() {
  const { connect, disconnect } = useSocket();
  const webrtc = useWebRTC();
  const chat = useChat();

  const connectionStore = useConnectionStore();
  const chatStore = useChatStore();
  const userStore = useUserStore();

  let listenersBound = false;

  function bindListeners(): void {
    if (listenersBound) return;
    const socket = connect();

    socket.on("connect", () => {
      // Re-enqueue automatically on connect/reconnect if we were searching in the UI.
      // This prevents the user from being dropped from the queue silently during connection hops or transport fallbacks.
      if (connectionStore.status === "queued") {
        socket.emit("find-partner");
      }
    });

    socket.on("queue-joined", () => {
      connectionStore.setQueued();
    });

    socket.on("partner-found", async ({ roomId, initiator }) => {
      chatStore.clear();
      connectionStore.setMatched(roomId, initiator);
      await webrtc.createPeerConnection();
      webrtc.setCameraEnabled(userStore.isCameraOn);
      webrtc.setMicEnabled(userStore.isMicOn);
      if (initiator) await webrtc.makeOffer();
    });

    socket.on("offer", async ({ sdp }) => {
      // We may receive an offer before partner-found's peer connection
      // setup finishes in rare race conditions; createPeerConnection() is
      // idempotent-safe to call again since handleRemoteOffer guards on it existing.
      await webrtc.handleRemoteOffer(sdp);
    });

    socket.on("answer", async ({ sdp }) => {
      await webrtc.handleRemoteAnswer(sdp);
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      await webrtc.handleRemoteIceCandidate(candidate);
    });

    socket.on("partner-left", () => {
      webrtc.teardownPeerConnection();
      connectionStore.setPartnerLeft();

      // Automatically re-queue after a brief delay so the user doesn't get stuck
      // on the "Stranger disconnected" screen and can keep chatting.
      setTimeout(() => {
        if (connectionStore.status === "partner-left") {
          findNext();
        }
      }, 1500);
    });

    socket.on("error-message", ({ message }) => {
      connectionStore.setError(message);
    });

    socket.on("rate-limited", () => {
      // Surfaced via UI state rather than a hard error - the user just
      // needs to wait a moment before retrying.
    });

    chat.bindListeners();
    listenersBound = true;
  }

  async function start(): Promise<void> {
    connectionStore.setStatus("requesting-media");
    await webrtc.requestLocalMedia();
    connectionStore.setStatus("media-ready");
    bindListeners();
    const socket = connect();
    socket.emit("find-partner");
    connectionStore.setQueued();
  }

  function findNext(): void {
    webrtc.teardownPeerConnection();
    chatStore.clear();
    const socket = connect();
    socket.emit("next-partner");
    connectionStore.setQueued();
  }

  function endChat(): void {
    webrtc.teardownPeerConnection();
    webrtc.stopLocalMedia();
    chatStore.clear();
    const socket = connect();
    socket.emit("leave-chat");
    disconnect();
    connectionStore.reset();
  }

  function reportPartner(reason: string): void {
    const socket = connect();
    socket.emit("report-partner", { reason });
    webrtc.teardownPeerConnection();
  }

  return {
    ...webrtc,
    start,
    findNext,
    endChat,
    reportPartner,
    sendMessage: chat.sendMessage,
    notifyTyping: chat.notifyTyping,
  };
}
