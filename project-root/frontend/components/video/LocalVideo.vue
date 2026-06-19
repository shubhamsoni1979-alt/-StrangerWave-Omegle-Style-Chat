<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";

const props = defineProps<{
  stream: MediaStream | null;
  cameraOn: boolean;
}>();

import { toRaw } from "vue";

const videoEl = ref<HTMLVideoElement | null>(null);

watch(
  () => props.stream,
  (stream) => {
    if (videoEl.value) {
      const rawStream = toRaw(stream);
      videoEl.value.srcObject = rawStream;
      videoEl.value.muted = true;
      if (rawStream) {
        videoEl.value.play().catch((err) => console.error("Local video play failed:", err));
      }
    }
  }
);

onMounted(() => {
  if (videoEl.value) {
    const rawStream = toRaw(props.stream);
    videoEl.value.srcObject = rawStream;
    videoEl.value.muted = true;
    if (rawStream) {
      videoEl.value.play().catch((err) => console.error("Local video play failed:", err));
    }
  }
});

onBeforeUnmount(() => {
  if (videoEl.value) videoEl.value.srcObject = null;
});
</script>

<template>
  <div class="relative w-full h-full overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10">
    <video
      ref="videoEl"
      autoplay
      playsinline
      muted
      class="h-full w-full scale-x-[-1] object-cover"
      :class="{ 'opacity-0': !cameraOn }"
    />
    <div v-if="!cameraOn" class="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
      Camera is off
    </div>
    <span
      class="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white/90"
    >
      You
    </span>
  </div>
</template>
