<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { toRaw } from "vue";
import { useConnectionStore } from "~/stores/connection";

const props = defineProps<{
  stream: MediaStream | null;
  isConnected: boolean;
  isSearching: boolean;
}>();

const emit = defineEmits<{
  next: [];
}>();

const connectionStore = useConnectionStore();

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
      <template v-if="connectionStore.status === 'error'">
        <UIcon name="i-heroicons-exclamation-triangle" class="h-10 w-10 text-red-500 animate-bounce" />
        <p class="text-sm select-none font-medium tracking-wide px-6 text-center text-red-400 max-w-xs leading-relaxed">
          {{ connectionStore.errorMessage || "Something went wrong" }}
        </p>
        <button
          type="button"
          class="mt-2 px-5 py-2.5 bg-gradient-to-r from-[#6C63FF] to-[#4F7CFF] text-white rounded-full font-bold text-xs tracking-wider uppercase shadow-lg shadow-purple-500/20 active:scale-95 transition-all duration-200 hover:brightness-110 pointer-events-auto"
          @click.stop="emit('next')"
        >
          Try Again
        </button>
      </template>
      <template v-else>
        <UIcon
          :name="isSearching ? 'i-heroicons-arrow-path' : 'i-heroicons-video-camera-slash'"
          class="h-10 w-10 text-[#6C63FF]"
          :class="{ 'animate-spin': isSearching }"
        />
        <p class="text-sm select-none font-medium tracking-wide">
          {{ isSearching ? "Looking for someone to talk to..." : "Not connected yet" }}
        </p>
      </template>
    </div>

    <!-- Top-Left Stranger Info Overlay (Desktop only) -->
    <div v-if="isConnected && stream" class="hidden lg:flex absolute top-4 left-4 items-center gap-2 rounded-2xl bg-black/45 backdrop-blur-md px-3.5 py-2 ring-1 ring-white/15">
      <div class="h-9 w-9 rounded-full bg-slate-500/30 border border-slate-400/50 flex items-center justify-center text-sm font-black text-white uppercase">
        {{ connectionStore.partnerName ? connectionStore.partnerName.charAt(0) : 'S' }}
      </div>
      <div class="flex flex-col text-left mr-2">
        <span class="text-xs font-bold text-white leading-tight">{{ connectionStore.partnerName || 'Stranger' }}</span>
        <span class="text-[9px] font-medium text-neutral-300 leading-none">{{ connectionStore.partnerFlag }} {{ connectionStore.partnerCountry }}</span>
      </div>
      <!-- Badges from screenshot -->
      <div class="flex items-center gap-1">
        <span class="h-6 w-6 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-xs">💜</span>
        <span class="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs">👮</span>
      </div>
    </div>

    <!-- Bottom-Left Brand Overlay (Desktop only) -->
    <div v-if="isConnected" class="hidden lg:flex absolute bottom-4 left-4 items-center gap-2 rounded-xl bg-black/45 backdrop-blur-md px-3 py-1.5 ring-1 ring-white/15">
      <span class="text-xs font-extrabold text-white flex items-center gap-1.5">
        <span class="text-amber-400">🐵</span> strangerwave.app
      </span>
    </div>

    <!-- Bottom-Right Skip Button (Desktop only) -->
    <button
      v-if="isConnected && !isSearching"
      type="button"
      class="hidden lg:flex absolute bottom-4 right-4 z-20 h-11 w-11 items-center justify-center rounded-xl bg-black/50 hover:bg-black/75 active:scale-95 text-white transition-all duration-200 border border-white/10 shadow-2xl backdrop-blur-md"
      aria-label="Next stranger"
      @click.stop="emit('next')"
    >
      <UIcon name="i-heroicons-forward" class="h-6 w-6 text-white" />
    </button>

    <!-- Mobile Label -->
    <span
      v-if="isConnected"
      class="lg:hidden absolute bottom-3 left-3 rounded-full bg-black/60 backdrop-blur-[2px] px-3 py-1 text-xs font-medium text-white/90 select-none font-sans ring-1 ring-white/10"
    >
      Stranger
    </span>
  </div>
</template>
