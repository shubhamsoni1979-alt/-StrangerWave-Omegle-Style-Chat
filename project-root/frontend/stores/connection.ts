import { defineStore } from "pinia";
import type { ConnectionState } from "~/types/webrtc";

export const useConnectionStore = defineStore("connection", {
  state: () => ({
    status: "idle" as ConnectionState,
    roomId: null as string | null,
    isInitiator: false,
    errorMessage: null as string | null,
    /** How many strangers this tab has talked to this session - purely cosmetic. */
    strangerCount: 0,
    isBotMode: false,
  }),

  getters: {
    isSearching: (state) => state.status === "queued",
    isConnected: (state) => state.status === "connected",
    isMatched: (state) => state.status === "matched" || state.status === "connected",
  },

  actions: {
    setStatus(status: ConnectionState) {
      this.status = status;
    },
    setMatched(roomId: string, isInitiator: boolean) {
      this.roomId = roomId;
      this.isInitiator = isInitiator;
      this.status = "matched";
      this.strangerCount += 1;
      this.isBotMode = false;
    },
    setBotMatched() {
      this.roomId = "bot-room";
      this.isInitiator = false;
      this.status = "connected";
      this.isBotMode = true;
      this.strangerCount += 1;
    },
    setConnected() {
      this.status = "connected";
    },
    setPartnerLeft() {
      this.roomId = null;
      this.isInitiator = false;
      this.status = "partner-left";
      this.isBotMode = false;
    },
    setQueued() {
      this.roomId = null;
      this.status = "queued";
      this.isBotMode = false;
    },
    setError(message: string) {
      this.errorMessage = message;
      this.status = "error";
      this.isBotMode = false;
    },
    reset() {
      this.status = "idle";
      this.roomId = null;
      this.isInitiator = false;
      this.errorMessage = null;
      this.isBotMode = false;
    },
  },
});
