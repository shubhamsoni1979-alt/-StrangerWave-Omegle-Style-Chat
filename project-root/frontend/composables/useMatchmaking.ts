import { watch } from "vue";
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
  let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  let matchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Automatically clear the negotiation timeout when connected
  watch(
    () => connectionStore.status,
    (status) => {
      if (status === "connected") {
        clearConnectionTimeout();
      }
    }
  );

  function startConnectionTimeout(): void {
    clearConnectionTimeout();
    connectionTimeout = setTimeout(() => {
      if (connectionStore.status === "matched") {
        console.warn("WebRTC connection negotiation timed out. Finding next partner.");
        findNext();
      }
    }, 10000); // 10s negotiation limit
  }

  function clearConnectionTimeout(): void {
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
  }

  function startMatchTimeout(): void {
    clearMatchTimeout();
    matchTimeout = setTimeout(() => {
      if (connectionStore.status === "queued") {
        console.warn("Matchmaking timed out. No partner found.");
        connectionStore.setError("No matches found. Want to try again?");
      }
    }, 30000); // 30s match timeout
  }

  function clearMatchTimeout(): void {
    if (matchTimeout) {
      clearTimeout(matchTimeout);
      matchTimeout = null;
    }
  }

  function handleConnectionFailure(): void {
    console.warn("WebRTC connection failed or disconnected. Finding next partner.");
    findNext();
  }

  function bindListeners(): void {
    if (listenersBound) return;
    const socket = connect();

    // Clean up any existing listeners on these events first to avoid duplicates
    socket.off("connect");
    socket.off("queue-joined");
    socket.off("partner-found");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    socket.off("partner-left");
    socket.off("error-message");
    socket.off("rate-limited");
    socket.off("online-count");
    socket.off("queue-status");
    socket.off("matched");
    socket.off("no-match-available");

    socket.on("connect", () => {
      // Re-enqueue automatically on connect/reconnect if we were searching in the UI.
      // This prevents the user from being dropped from the queue silently during connection hops or transport fallbacks.
      if (connectionStore.status === "queued" || connectionStore.status === "media-ready") {
        socket.emit("find-partner", {
          name: userStore.userName,
          country: userStore.userCountry,
          flag: userStore.userFlag,
          deviceType: connectionStore.deviceType,
        });
      }
    });

    socket.on("queue-joined", () => {
      connectionStore.setQueued();
    });

    socket.on("partner-found", async ({ roomId, initiator, partner }) => {
      chatStore.clear();
      connectionStore.setMatched(roomId, initiator, partner);
      clearMatchTimeout();
      startConnectionTimeout();

      try {
        await webrtc.createPeerConnection(() => {
          handleConnectionFailure();
        });
        webrtc.setCameraEnabled(userStore.isCameraOn);
        webrtc.setMicEnabled(userStore.isMicOn);
        if (initiator) await webrtc.makeOffer();
      } catch (err) {
        console.error("Failed to establish WebRTC connection:", err);
        findNext();
      }
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

    socket.on("online-count", ({ count }) => {
      connectionStore.setOnlineCount(count);
    });

    socket.on("queue-status", (data) => {
      connectionStore.setQueueStatus(data.size, data.myPosition);
    });

    socket.on("matched", (payload) => {
      console.log("[Socket] matched event received in console:", payload);
    });

    socket.on("no-match-available", () => {
      console.warn("No match available received from server.");
      clearMatchTimeout();
      connectionStore.setError("No matches found. Want to try again?");
    });

    chat.bindListeners();
    listenersBound = true;
  }

  async function start(): Promise<void> {
    connectionStore.setStatus("requesting-media");
    try {
      await webrtc.requestLocalMedia();
      connectionStore.setStatus("media-ready");
    } catch (err) {
      console.warn("Failed to get local media, proceeding as text-only/receiver-only:", err);
      connectionStore.setStatus("media-ready");
    }

    if (typeof window !== "undefined") {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      connectionStore.setDeviceType(isMobile ? "mobile" : "desktop");
    }

    bindListeners();
    const socket = connect();
    connectionStore.setQueued();

    if (socket.connected) {
      socket.emit("find-partner", {
        name: userStore.userName,
        country: userStore.userCountry,
        flag: userStore.userFlag,
        deviceType: connectionStore.deviceType,
      });
    }

    startMatchTimeout();
  }

  function findNext(): void {
    clearConnectionTimeout();
    clearMatchTimeout();
    webrtc.teardownPeerConnection();
    chatStore.clear();
    const socket = connect();
    socket.emit("next-partner");
    connectionStore.setQueued();
    startMatchTimeout();
  }

  function endChat(): void {
    clearConnectionTimeout();
    clearMatchTimeout();
    webrtc.teardownPeerConnection();
    webrtc.stopLocalMedia();
    chatStore.clear();
    const socket = connect();
    socket.emit("leave-chat");

    // Clean up event listeners for this page to prevent duplicates on next visit
    socket.off("connect");
    socket.off("queue-joined");
    socket.off("partner-found");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    socket.off("partner-left");
    socket.off("error-message");
    socket.off("rate-limited");
    socket.off("online-count");
    socket.off("queue-status");
    socket.off("matched");
    socket.off("no-match-available");
    
    // Also clean up useChat listeners
    socket.off("receive-message");
    socket.off("typing");

    disconnect();
    connectionStore.reset();
  }

  function reportPartner(reason: string): void {
    clearConnectionTimeout();
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
