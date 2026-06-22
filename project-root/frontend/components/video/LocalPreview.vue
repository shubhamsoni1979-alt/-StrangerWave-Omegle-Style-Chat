<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, toRaw } from "vue";

const props = defineProps<{
  stream: MediaStream | null;
  cameraOn: boolean;
}>();

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
  <div
    class="relative select-none overflow-hidden rounded-2xl bg-[#0F1117]/80 ring-2 ring-[#6C63FF]/30 shadow-[0_0_20px_rgba(108,99,255,0.3)] transition-all duration-300 hover:scale-105 active:scale-[0.98]"
  >
    <!-- Camera Feed -->
    <video
      ref="videoEl"
      autoplay
      playsinline
      muted
      class="h-full w-full scale-x-[-1] object-cover"
      :class="{ 'opacity-0': !cameraOn }"
    />

    <!-- Camera Off Placeholder -->
    <div
      v-if="!cameraOn"
      class="absolute inset-0 flex flex-col items-center justify-center bg-[#0F1117]/90 text-[10px] font-semibold text-neutral-400 text-center p-1"
    >
      <UIcon name="i-heroicons-video-camera-slash" class="h-4 w-4 text-neutral-500 mb-1" />
      <span>Camera off</span>
    </div>

    <!-- YOU Label -->
    <span
      class="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 backdrop-blur-[2px] px-2.5 py-0.5 text-[9px] font-black tracking-widest text-white ring-1 ring-white/10 uppercase select-none"
    >
      YOU
    </span>
  </div>
</template>
