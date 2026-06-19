import { useChatStore } from "~/stores/chat";

const TYPING_STOP_DELAY_MS = 2000;
const MAX_MESSAGE_LENGTH = 500;

export function useChat() {
  const { connect } = useSocket();
  const chatStore = useChatStore();
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  let listenersBound = false;

  function bindListeners(): void {
    if (listenersBound) return;
    const socket = connect();

    // Remove any existing listeners first to prevent duplicates
    socket.off("receive-message");
    socket.off("typing");

    // The server only ever forwards this event to the *other* member of the
    // room (see backend/src/socket/chat.ts), so every message we receive
    // here came from the stranger, never an echo of our own.
    socket.on("receive-message", (payload) => {
      chatStore.addMessage({
        id: `${payload.at}-${Math.random().toString(36).slice(2, 8)}`,
        text: payload.text,
        at: payload.at,
        from: "stranger",
      });
    });

    socket.on("typing", (payload) => {
      chatStore.setStrangerTyping(payload.isTyping);
    });

    listenersBound = true;
  }

  function sendMessage(rawText: string): void {
    const text = rawText.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return;
    const socket = connect();
    const at = Date.now();
    socket.emit("send-message", { text });
    chatStore.addMessage({
      id: `${at}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      at,
      from: "me",
    });
    stopTyping();
  }

  function notifyTyping(): void {
    const socket = connect();
    socket.emit("typing", { isTyping: true });
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, TYPING_STOP_DELAY_MS);
  }

  function stopTyping(): void {
    const socket = connect();
    socket.emit("typing", { isTyping: false });
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
  }

  return { bindListeners, sendMessage, notifyTyping, stopTyping };
}
