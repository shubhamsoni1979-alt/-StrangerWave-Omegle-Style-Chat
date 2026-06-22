<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, toRaw } from "vue";

const props = defineProps<{
  stream: MediaStream | null;
  label: string;
  isMuted?: boolean;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const internalMuted = ref(props.isMuted ?? false);
const showUnmutePrompt = ref(false);

async function attemptPlay() {
  if (!videoEl.value || !props.stream) return;

  try {
    videoEl.value.muted = internalMuted.value;
    await videoEl.value.play();
    if (!internalMuted.value) {
      showUnmutePrompt.value = false;
    }
  } catch (err) {
    if (!props.isMuted) {
      console.warn("Group video autoplay blocked, falling back to muted:", err);
      internalMuted.value = true;
      showUnmutePrompt.value = true;
      if (videoEl.value) {
        videoEl.value.muted = true;
        try {
          await videoEl.value.play();
        } catch (muteErr) {
          console.error("Group video muted play also failed:", muteErr);
        }
      }
    } else {
      console.error("Local/muted group video play failed:", err);
    }
  }
}

function handleVideoClick() {
  if (!videoEl.value || props.isMuted) return;

  if (internalMuted.value) {
    internalMuted.value = false;
    videoEl.value.muted = false;
    showUnmutePrompt.value = false;
    videoEl.value.play().catch((err) => {
      console.error("Group video play failed after unmute gesture:", err);
      internalMuted.value = true;
      showUnmutePrompt.value = true;
      if (videoEl.value) videoEl.value.muted = true;
    });
  } else {
    videoEl.value.play().catch(() => {});
  }
}

watch(
  () => props.stream,
  (stream) => {
    if (videoEl.value) {
      const rawStream = toRaw(stream);
      videoEl.value.srcObject = rawStream;
      if (rawStream) {
        attemptPlay();
      }
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (videoEl.value && props.stream) {
    const rawStream = toRaw(props.stream);
    videoEl.value.srcObject = rawStream;
    attemptPlay();
  }
});

onBeforeUnmount(() => {
  if (videoEl.value) {
    videoEl.value.srcObject = null;
  }
});
</script>

<template>
  <div
    class="relative w-full h-full overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10"
    :class="{ 'cursor-pointer': !isMuted && internalMuted }"
    @click="handleVideoClick"
  >
    <video
      ref="videoEl"
      autoplay
      playsinline
      :muted="internalMuted"
      class="h-full w-full object-cover"
    />

    <!-- Tap to Unmute Overlay -->
    <div
      v-if="!isMuted && showUnmutePrompt"
      class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-300 pointer-events-none"
    >
      <div class="flex flex-col items-center gap-1.5 rounded-xl bg-neutral-950/80 px-3 py-2 text-white ring-1 ring-white/10 shadow-xl">
        <UIcon name="i-heroicons-speaker-x-mark" class="h-5 w-5 text-amber-400 animate-bounce" />
        <span class="text-[10px] font-semibold select-none">Tap to Unmute</span>
      </div>
    </div>

    <span class="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white/90 select-none font-sans">
      {{ label }}
    </span>
  </div>
</template>
