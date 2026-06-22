<script setup lang="ts">
import { useConnectionStore } from "~/stores/connection";

const connectionStore = useConnectionStore();
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-white/5 bg-[#0F1117] px-4 shrink-0 select-none"
    style="padding-top: env(safe-area-inset-top);">
    <!-- Logo -->
    <div class="flex items-center gap-2">
      <h1 class="text-lg font-bold tracking-tight text-white">
        Stranger<span
          class="bg-gradient-to-r from-[#4F7CFF] to-[#6C63FF] bg-clip-text text-transparent font-extrabold">Wave</span>
      </h1>
    </div>

    <!-- Status Toggles & Pill -->
    <div class="flex items-center gap-3">
      <!-- Status Indicators from existing stores -->
      <!-- <MatchStatus :status="connectionStore.status" /> -->
      <ConnectionStatus />

      <!-- Custom Capsule Pill from Design Spec -->
      <div
        class="flex items-center gap-2.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 font-sans text-[10px] font-extrabold tracking-wider text-green-400">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
        </span>
        {{ connectionStore.onlineCount || 1 }} ONLINE
      </div>
    </div>
  </header>
</template>
