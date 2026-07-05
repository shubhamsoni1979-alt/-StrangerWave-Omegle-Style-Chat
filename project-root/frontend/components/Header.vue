<script setup lang="ts">
import { useConnectionStore } from "~/stores/connection";

const connectionStore = useConnectionStore();
</script>

<template>
  <header class="flex h-16 items-center justify-between bg-transparent px-6 shrink-0 select-none relative z-30"
    style="padding-top: calc(12px + env(safe-area-inset-top));">
    <!-- Logo -->
    <div class="flex items-center gap-4">
      <h1 class="text-lg font-bold tracking-tight text-white">
        Stranger<span
          class="bg-gradient-to-r from-[#4F7CFF] to-[#6C63FF] bg-clip-text text-transparent font-extrabold">Wave</span>
      </h1>
    </div>

    <!-- Status Toggles & Pill -->
    <div class="flex items-center gap-3">
      <ConnectionStatus />

      <!-- Online Count Capsule -->
      <div
        class="flex items-center gap-2.5 rounded-full border border-green-500/20 bg-green-500/10 px-3.5 py-1.5 font-sans text-[10px] font-extrabold tracking-wider text-green-400">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
        </span>
        {{ connectionStore.onlineCount || 1 }} ONLINE
      </div>

      <!-- Avatar placeholder matching top-right of screenshot -->
      <div class="h-8 w-8 rounded-full border border-white/20 bg-neutral-800 flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-md">
        <UIcon name="i-heroicons-user" class="h-4 w-4 text-neutral-400" />
      </div>
    </div>
  </header>
</template>
