<script setup lang="ts">
import { useConnectionStore } from "~/stores/connection";

const props = defineProps<{
  cameraOn: boolean;
  micOn: boolean;
  isSearching: boolean;
  isConnected: boolean;
}>();

const emit = defineEmits<{
  toggleCamera: [];
  toggleMic: [];
  next: [];
  end: [];
  report: [];
}>();

const connectionStore = useConnectionStore();
</script>

<template>
  <div
    class="flex items-center justify-between lg:justify-center lg:gap-8 border-t lg:border border-white/10 bg-[#0F1117]/80 lg:bg-[#1D173D]/60 px-6 py-3 backdrop-blur-md shrink-0 w-full lg:w-auto lg:rounded-full select-none shadow-2xl transition-all duration-300"
    style="padding-bottom: calc(12px + env(safe-area-inset-bottom));"
  >
    <!-- Left Controls (Next / Disconnect) -->
    <div class="flex items-center gap-3">
      <!-- Disconnect (End Call) Button -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 transition-all duration-200 active:scale-95 border border-red-500/20 shadow-md"
        aria-label="Disconnect call"
        @click="emit('end')"
      >
        <UIcon name="i-heroicons-phone-x-mark" class="h-5 w-5" />
      </button>

      <!-- Next Button (Purple gradient) -->
      <button
        type="button"
        :disabled="isSearching"
        class="flex h-11 px-5 items-center justify-center gap-2 rounded-full font-sans font-bold text-sm tracking-wide text-white transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none bg-gradient-to-r from-[#6C63FF] to-[#4F7CFF] shadow-[0_4px_15px_rgba(108,99,255,0.4)] hover:brightness-110"
        @click="emit('next')"
      >
        <UIcon name="i-heroicons-arrow-path" class="h-4 w-4 animate-spin-slow" :class="{ 'animate-spin': isSearching }" />
        <span>{{ isSearching ? "Searching..." : "Next" }}</span>
      </button>
    </div>

    <!-- Right Controls (Mic / Camera / More options toggles) -->
    <div class="flex items-center gap-2.5">
      <!-- Microphone Toggle -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-95 border border-white/10 shadow-sm"
        :class="micOn ? 'bg-[#0F1117]/60 hover:bg-[#0F1117]/80 text-neutral-200' : 'bg-red-500/20 text-red-400 border-red-500/30'"
        :aria-label="micOn ? 'Mute microphone' : 'Unmute microphone'"
        @click="emit('toggleMic')"
      >
        <UIcon :name="micOn ? 'i-heroicons-microphone' : 'i-heroicons-microphone-slash'" class="h-5 w-5" />
      </button>

      <!-- Camera Toggle -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-95 border border-white/10 shadow-sm"
        :class="cameraOn ? 'bg-[#0F1117]/60 hover:bg-[#0F1117]/80 text-neutral-200' : 'bg-red-500/20 text-red-400 border-red-500/30'"
        :aria-label="cameraOn ? 'Turn camera off' : 'Turn camera on'"
        @click="emit('toggleCamera')"
      >
        <UIcon :name="cameraOn ? 'i-heroicons-video-camera' : 'i-heroicons-video-camera-slash'" class="h-5 w-5" />
      </button>

      <!-- Report Partner Button -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 transition-all duration-200 active:scale-95 border border-red-500/20 shadow-sm"
        aria-label="Report partner"
        @click="emit('report')"
      >
        <UIcon name="i-heroicons-flag" class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 3s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
