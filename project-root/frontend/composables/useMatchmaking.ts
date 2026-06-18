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
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  function startSearchingTimer(): void {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (connectionStore.status === "queued") {
        startBotSimulation();
      }
    }, 5000);
  }

  function startBotSimulation(): void {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
    // Leave the backend queue
    const socket = connect();
    socket.emit("leave-chat");

    chatStore.clear();
    connectionStore.setBotMatched();
    webrtc.remoteStream.value = null;

    setTimeout(() => {
      chatStore.setStrangerTyping(true);
    }, 1000);

    setTimeout(() => {
      chatStore.setStrangerTyping(false);
      chatStore.addMessage({
        id: `mock-1-${Date.now()}`,
        text: "Hello there! I am WaveBot, your simulated companion. How can I help you today? 🤖",
        at: Date.now(),
        from: "stranger"
      });
    }, 3000);
  }

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
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
      }
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
    startSearchingTimer();
  }

  function findNext(): void {
    webrtc.teardownPeerConnection();
    chatStore.clear();
    const socket = connect();
    socket.emit("next-partner");
    connectionStore.setQueued();
    startSearchingTimer();
  }

  function endChat(): void {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
    webrtc.teardownPeerConnection();
    webrtc.stopLocalMedia();
    chatStore.clear();
    const socket = connect();
    socket.emit("leave-chat");
    disconnect();
    connectionStore.reset();
  }

  function reportPartner(reason: string): void {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
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
    startBotSimulation,
    sendMessage: chat.sendMessage,
    notifyTyping: chat.notifyTyping,
  };
}
