<script setup lang="ts">
import type { ConnectionState } from "~/types/webrtc";

const props = defineProps<{ status: ConnectionState }>();

const copy: Record<ConnectionState, { text: string; icon: string; tone: string }> = {
  idle: { text: "Ready when you are", icon: "i-heroicons-play", tone: "text-neutral-400" },
  "requesting-media": { text: "Requesting camera & mic access…", icon: "i-heroicons-camera", tone: "text-amber-400" },
  "media-ready": { text: "Getting you into the queue…", icon: "i-heroicons-clock", tone: "text-amber-400" },
  queued: { text: "Looking for someone to talk to…", icon: "i-heroicons-magnifying-glass", tone: "text-amber-400" },
  matched: { text: "Connecting to a stranger…", icon: "i-heroicons-link", tone: "text-blue-400" },
  connected: { text: "Connected — say hi!", icon: "i-heroicons-check-circle", tone: "text-green-400" },
  "partner-left": { text: "Stranger disconnected", icon: "i-heroicons-user-minus", tone: "text-neutral-400" },
  error: { text: "Something went wrong", icon: "i-heroicons-exclamation-triangle", tone: "text-red-400" },
};
</script>

<template>
  <div class="flex items-center gap-2 text-sm font-medium" :class="copy[status].tone">
    <UIcon :name="copy[status].icon" class="h-4 w-4" :class="{ 'animate-pulse': status === 'queued' }" />
    {{ copy[status].text }}
  </div>
</template>
