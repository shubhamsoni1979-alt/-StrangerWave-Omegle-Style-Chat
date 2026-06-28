<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { toRaw } from "vue";

const props = defineProps<{
  stream: MediaStream | null;
  isConnected: boolean;
  isSearching: boolean;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const isMuted = ref(true);
const showUnmutePrompt = ref(true);

async function attemptPlay() {
  if (!videoEl.value || !props.stream) return;

  try {
    // 1. Try to play muted first (guaranteed to succeed on all mobile/PC browsers)
    videoEl.value.muted = true;
    await videoEl.value.play();

    // 2. Try to unmute programmatically (will succeed if user already interacted, e.g. clicked Start)
    videoEl.value.muted = false;
    try {
      await videoEl.value.play();
      isMuted.value = false;
      showUnmutePrompt.value = false;
    } catch (unmuteErr) {
      // Unmuting blocked by autoplay restriction, keep muted
      videoEl.value.muted = true;
      isMuted.value = true;
      showUnmutePrompt.value = true;
    }
  } catch (err) {
    console.error("Muted autoplay failed:", err);
  }
}

function handleVideoClick() {
  if (!videoEl.value) return;

  if (isMuted.value) {
    isMuted.value = false;
    videoEl.value.muted = false;
    showUnmutePrompt.value = false;
    videoEl.value.play().catch((err) => {
      console.error("Failed to play remote video after unmute gesture:", err);
      isMuted.value = true;
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
  }
);

onMounted(() => {
  if (videoEl.value) {
    const rawStream = toRaw(props.stream);
    videoEl.value.srcObject = rawStream;
    if (rawStream) {
      attemptPlay();
    }
  }
});

onBeforeUnmount(() => {
  if (videoEl.value) videoEl.value.srcObject = null;
});
</script>

<template>
  <div
    class="relative w-full h-full overflow-hidden bg-[#0F1117]"
    :class="{ 'cursor-pointer': isConnected && isMuted && stream }"
    @click="handleVideoClick"
  >
    <video
      ref="videoEl"
      autoplay
      playsinline
      :muted="isMuted"
      class="h-full w-full object-cover bg-black"
      :class="{ 'opacity-0': !isConnected || !stream }"
    />

    <!-- Tap to Unmute Overlay -->
    <div
      v-if="isConnected && stream && showUnmutePrompt"
      class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-300 pointer-events-none"
    >
      <div class="flex flex-col items-center gap-2 rounded-xl bg-neutral-950/80 px-4 py-3 text-white ring-1 ring-white/10 shadow-xl">
        <UIcon name="i-heroicons-speaker-x-mark" class="h-6 w-6 text-amber-400 animate-bounce" />
        <span class="text-xs font-semibold select-none">Tap to Unmute Audio</span>
      </div>
    </div>

    <!-- Stranger's camera is off overlay -->
    <div
      v-if="isConnected && !stream"
      class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400 bg-neutral-950"
    >
      <UIcon name="i-heroicons-video-camera-slash" class="h-8 w-8 text-neutral-500" />
      <p class="text-sm font-medium select-none">Stranger's camera is off</p>
    </div>

    <!-- Search/Status Overlay -->
    <div v-if="!isConnected" class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-neutral-400 bg-[#0F1117]">
      <UIcon
        :name="isSearching ? 'i-heroicons-arrow-path' : 'i-heroicons-video-camera-slash'"
        class="h-10 w-10 text-[#6C63FF]"
        :class="{ 'animate-spin': isSearching }"
      />
      <p class="text-sm select-none font-medium tracking-wide">
        {{ isSearching ? "Looking for someone to talk to..." : "Not connected yet" }}
      </p>
    </div>

    <span
      v-if="isConnected"
      class="absolute bottom-3 left-3 rounded-full bg-black/60 backdrop-blur-[2px] px-3 py-1 text-xs font-medium text-white/90 select-none font-sans ring-1 ring-white/10"
    >
      Stranger
    </span>
  </div>
</template>
