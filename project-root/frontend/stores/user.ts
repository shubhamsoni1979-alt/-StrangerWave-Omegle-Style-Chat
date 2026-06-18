import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: () => ({
    /**
     * Self-attested confirmation that the visitor is 18+ and accepts the
     * community rules. This is a click-through, not real age verification -
     * see README for what a production deployment needs beyond this MVP.
     */
    hasAcceptedTerms: false,
    isCameraOn: true,
    isMicOn: true,
  }),

  actions: {
    acceptTerms() {
      this.hasAcceptedTerms = true;
    },
    toggleCamera(value?: boolean) {
      this.isCameraOn = value ?? !this.isCameraOn;
    },
    toggleMic(value?: boolean) {
      this.isMicOn = value ?? !this.isMicOn;
    },
  },
});
