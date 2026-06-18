<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";

const props = defineProps<{
  stream: MediaStream | null;
  isConnected: boolean;
  isSearching: boolean;
  isBotMode?: boolean;
}>();

import { toRaw } from "vue";

const videoEl = ref<HTMLVideoElement | null>(null);

watch(
  () => props.stream,
  (stream) => {
    if (videoEl.value) {
      const rawStream = toRaw(stream);
      videoEl.value.srcObject = rawStream;
      if (rawStream) {
        videoEl.value.play().catch((err) => console.error("Remote video play failed:", err));
      }
    }
  }
);

onMounted(() => {
  if (videoEl.value) {
    const rawStream = toRaw(props.stream);
    videoEl.value.srcObject = rawStream;
    if (rawStream) {
      videoEl.value.play().catch((err) => console.error("Remote video play failed:", err));
    }
  }
});

onBeforeUnmount(() => {
  if (videoEl.value) videoEl.value.srcObject = null;
});
</script>

<template>
  <div class="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10">
    <video v-if="!isBotMode" ref="videoEl" autoplay playsinline class="h-full w-full object-cover"
      :class="{ 'opacity-0': !isConnected }" />
    <img v-else src="/public/bot-avatar.png" alt="Bot Avatar" class="h-full w-full object-cover"
      :class="{ 'opacity-0': !isConnected }" />

    <div v-if="!isConnected" class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-300">
      <UIcon :name="isSearching ? 'i-heroicons-arrow-path' : 'i-heroicons-video-camera-slash'" class="h-8 w-8"
        :class="{ 'animate-spin': isSearching }" />
      <p class="text-sm">
        {{ isSearching ? "Looking for someone to talk to…" : "Not connected yet" }}
      </p>
    </div>

    <span v-if="isConnected"
      class="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white/90">
      {{ isBotMode ? "WaveBot" : "Stranger" }}
    </span>
  </div>
</template>
