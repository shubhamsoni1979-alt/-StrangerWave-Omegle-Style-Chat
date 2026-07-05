<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, toRaw } from "vue";
import { useUserStore } from "~/stores/user";

const props = defineProps<{
  stream: MediaStream | null;
  cameraOn: boolean;
}>();

const userStore = useUserStore();
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
    class="relative h-full w-full select-none overflow-hidden rounded-[24px] bg-[#0F1117]/80 shadow-2xl transition-all duration-300"
  >
    <!-- Camera Feed -->
    <video
      ref="videoEl"
      autoplay
      playsinline
      muted
      class="h-full w-full scale-x-[-1] object-cover bg-black"
      :class="{ 'opacity-0': !cameraOn || !stream }"
    />

    <!-- Camera Off Placeholder -->
    <div
      v-if="!cameraOn || !stream"
      class="absolute inset-0 flex flex-col items-center justify-center bg-[#0F1117]/95 text-neutral-400 text-center p-4 gap-2"
    >
      <UIcon name="i-heroicons-video-camera-slash" class="h-8 w-8 text-neutral-500 mb-1" />
      <span class="text-sm font-semibold">Camera is off</span>
    </div>

    <!-- Top-Left Floating Info Card (Desktop only) -->
    <div v-if="cameraOn && stream" class="hidden lg:flex absolute top-4 left-4 items-center gap-2 rounded-2xl bg-black/45 backdrop-blur-md px-3.5 py-2 ring-1 ring-white/15">
      <div class="h-9 w-9 rounded-full bg-[#6C63FF]/30 border border-[#6C63FF]/50 flex items-center justify-center text-sm font-black text-white">
        {{ userStore.userName ? userStore.userName.charAt(0).toUpperCase() : 'Y' }}
      </div>
      <div class="flex flex-col text-left">
        <span class="text-xs font-bold text-white leading-tight">{{ userStore.userName || 'You' }}</span>
        <span class="text-[9px] font-medium text-neutral-300 leading-none">{{ userStore.userFlag }} {{ userStore.userCountry }}</span>
      </div>
    </div>

    <!-- YOU Label (Mobile only) -->
    <span
      class="lg:hidden absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 backdrop-blur-[2px] px-2.5 py-0.5 text-[9px] font-black tracking-widest text-white ring-1 ring-white/10 uppercase select-none"
    >
      YOU
    </span>
  </div>
</template>
