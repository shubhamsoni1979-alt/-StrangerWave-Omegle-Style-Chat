import { defineStore } from "pinia";
import type { ChatMessage } from "~/types/webrtc";

const MAX_RENDERED_MESSAGES = 500;

export const useChatStore = defineStore("chat", {
  state: () => ({
    messages: [] as ChatMessage[],
    strangerIsTyping: false,
    draft: "",
  }),

  actions: {
    addMessage(message: ChatMessage) {
      this.messages.push(message);
      if (this.messages.length > MAX_RENDERED_MESSAGES) {
        this.messages.splice(0, this.messages.length - MAX_RENDERED_MESSAGES);
      }
    },
    setStrangerTyping(isTyping: boolean) {
      this.strangerIsTyping = isTyping;
    },
    clear() {
      this.messages = [];
      this.strangerIsTyping = false;
      this.draft = "";
    },
  },
});
