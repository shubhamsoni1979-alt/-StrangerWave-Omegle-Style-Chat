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
    onlineCount: 0,
    partnerName: "Stranger",
    partnerCountry: "Unknown",
    partnerFlag: "🏳️",
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
    setMatched(roomId: string, isInitiator: boolean, partner?: { name: string; country: string; flag: string }) {
      this.roomId = roomId;
      this.isInitiator = isInitiator;
      this.status = "matched";
      this.strangerCount += 1;
      this.partnerName = partner?.name || "Stranger";
      this.partnerCountry = partner?.country || "Unknown";
      this.partnerFlag = partner?.flag || "🏳️";
    },
    setConnected() {
      this.status = "connected";
    },
    setPartnerLeft() {
      this.roomId = null;
      this.isInitiator = false;
      this.status = "partner-left";
      this.partnerName = "";
      this.partnerCountry = "";
      this.partnerFlag = "";
    },
    setQueued() {
      this.roomId = null;
      this.status = "queued";
      this.partnerName = "";
      this.partnerCountry = "";
      this.partnerFlag = "";
    },
    setError(message: string) {
      this.errorMessage = message;
      this.status = "error";
    },
    setOnlineCount(count: number) {
      this.onlineCount = count;
    },
    reset() {
      this.status = "idle";
      this.roomId = null;
      this.isInitiator = false;
      this.errorMessage = null;
      this.partnerName = "";
      this.partnerCountry = "";
      this.partnerFlag = "";
    },
  },
});
