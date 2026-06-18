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
  }

  function findNext(): void {
    webrtc.teardownPeerConnection();
    chatStore.clear();
    const socket = connect();
    socket.emit("next-partner");
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
