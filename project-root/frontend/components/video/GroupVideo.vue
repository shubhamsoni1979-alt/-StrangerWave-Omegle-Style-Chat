<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, toRaw } from "vue";

const props = defineProps<{
  stream: MediaStream | null;
  label: string;
  isMuted?: boolean;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);

watch(
  () => props.stream,
  (stream) => {
    if (videoEl.value) {
      const rawStream = toRaw(stream);
      videoEl.value.srcObject = rawStream;
      if (rawStream) {
        videoEl.value.play().catch(err => console.error("Play failed:", err));
      }
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (videoEl.value && props.stream) {
    const rawStream = toRaw(props.stream);
    videoEl.value.srcObject = rawStream;
    videoEl.value.play().catch(err => console.error("Play failed on mount:", err));
  }
});

onBeforeUnmount(() => {
  if (videoEl.value) {
    videoEl.value.srcObject = null;
  }
});
</script>

<template>
  <div class="relative w-full h-full overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10">
    <video
      ref="videoEl"
      autoplay
      playsinline
      :muted="isMuted"
      class="h-full w-full object-cover"
    />
    <span class="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white/90">
      {{ label }}
    </span>
  </div>
</template>
