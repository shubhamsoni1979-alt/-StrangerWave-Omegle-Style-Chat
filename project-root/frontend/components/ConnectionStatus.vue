<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const isOnline = ref(false);
const isReconnecting = ref(false);
const { connect } = useSocket();

let socket: ReturnType<typeof connect> | null = null;

function handleRetry() {
  if (socket && !socket.connected) {
    isReconnecting.value = true;
    socket.connect();
  }
}

onMounted(() => {
  socket = connect();
  isOnline.value = socket.connected;

  socket.on("connect", () => {
    isOnline.value = true;
    isReconnecting.value = false;
  });
  socket.on("disconnect", () => {
    isOnline.value = false;
  });
  socket.io.on("reconnect_attempt", () => {
    isReconnecting.value = true;
  });
});

onBeforeUnmount(() => {
  socket?.off("connect");
  socket?.off("disconnect");
});
</script>

<template>
  <div class="flex items-center gap-1.5 text-xs text-neutral-400 select-none">
    <span
      class="h-2 w-2 rounded-full"
      :class="isOnline ? 'bg-green-500' : isReconnecting ? 'bg-amber-500 animate-pulse' : 'bg-red-500'"
    />
    <span>{{ isOnline ? "Connected to server" : isReconnecting ? "Reconnecting…" : "Disconnected" }}</span>
    <button
      v-if="!isOnline && !isReconnecting"
      type="button"
      class="ml-1 px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 rounded text-[10px] text-white transition border border-white/10"
      @click="handleRetry"
    >
      Reconnect
    </button>
  </div>
</template>
