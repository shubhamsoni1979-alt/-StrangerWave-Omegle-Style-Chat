<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const isOnline = ref(false);
const isReconnecting = ref(false);
const { connect } = useSocket();

let socket: ReturnType<typeof connect> | null = null;

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
  <div class="flex items-center gap-1.5 text-xs text-neutral-400">
    <span
      class="h-2 w-2 rounded-full"
      :class="isOnline ? 'bg-green-500' : isReconnecting ? 'bg-amber-500 animate-pulse' : 'bg-red-500'"
    />
    {{ isOnline ? "Connected to server" : isReconnecting ? "Reconnecting…" : "Disconnected" }}
  </div>
</template>
