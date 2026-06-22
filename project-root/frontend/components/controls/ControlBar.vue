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
  toggleMore: [];
}>();

const connectionStore = useConnectionStore();
</script>

<template>
  <div
    class="flex items-center justify-between border-t border-white/5 bg-[#0F1117]/80 px-4 py-3 backdrop-blur-md shrink-0 w-full select-none"
    style="padding-bottom: calc(12px + env(safe-area-inset-bottom));"
  >
    <!-- Left Controls (Next / Disconnect) -->
    <div class="flex items-center gap-3">
      <!-- Disconnect (End Call) Button -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-800/80 text-neutral-400 hover:text-white transition-all duration-200 active:scale-95 border border-white/5 shadow-inner"
        aria-label="Disconnect call"
        @click="emit('end')"
      >
        <UIcon name="i-heroicons-phone-x-mark" class="h-5 w-5 text-red-500" />
      </button>

      <!-- Next Button (Purple gradient) -->
      <button
        type="button"
        :disabled="isSearching"
        class="flex h-11 px-5 items-center justify-center gap-2 rounded-xl font-sans font-bold text-sm tracking-wide text-white transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none bg-gradient-to-r from-[#6C63FF] to-[#4F7CFF] shadow-[0_4px_15px_rgba(108,99,255,0.4)] hover:brightness-110"
        @click="emit('next')"
      >
        <UIcon name="i-heroicons-arrow-path" class="h-4 w-4 animate-spin-slow" :class="{ 'animate-spin': isSearching }" />
        <span>{{ isSearching ? "Searching..." : "Next Stranger" }}</span>
      </button>
    </div>

    <!-- Right Controls (Mic / Camera / More options toggles) -->
    <div class="flex items-center gap-2.5">
      <!-- Microphone Toggle -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 border border-white/5 shadow-sm"
        :class="micOn ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700' : 'bg-red-500/20 text-red-400 border-red-500/30'"
        :aria-label="micOn ? 'Mute microphone' : 'Unmute microphone'"
        @click="emit('toggleMic')"
      >
        <UIcon :name="micOn ? 'i-heroicons-microphone' : 'i-heroicons-microphone-slash'" class="h-5 w-5" />
      </button>

      <!-- Camera Toggle -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 border border-white/5 shadow-sm"
        :class="cameraOn ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700' : 'bg-red-500/20 text-red-400 border-red-500/30'"
        :aria-label="cameraOn ? 'Turn camera off' : 'Turn camera on'"
        @click="emit('toggleCamera')"
      >
        <UIcon :name="cameraOn ? 'i-heroicons-video-camera' : 'i-heroicons-video-camera-slash'" class="h-5 w-5" />
      </button>

      <!-- More Options Menu -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-800/80 text-neutral-400 hover:text-white transition-all duration-200 active:scale-95 border border-white/5"
        aria-label="More options"
        @click="emit('toggleMore')"
      >
        <UIcon name="i-heroicons-ellipsis-horizontal" class="h-5 w-5" />
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
