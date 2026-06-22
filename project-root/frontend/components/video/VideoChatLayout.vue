<script setup lang="ts">
defineProps<{
  isChatOpen: boolean;
}>();
</script>

<template>
  <main
    class="flex flex-col bg-[#0F1117] text-neutral-100 overflow-hidden select-none w-full"
    style="height: var(--vh, 100vh);"
  >
    <!-- Top Header Position -->
    <slot name="header" />

    <!-- Main Workspace (Grid layout for Desktop, Flex/Absolute Overlay for Mobile) -->
    <div class="flex-1 min-h-0 flex lg:grid lg:grid-cols-[1fr_360px] w-full overflow-hidden relative">
      
      <!-- Video Stage Area -->
      <div class="relative flex-1 h-full min-h-0 overflow-hidden bg-black/40">
        
        <!-- Remote Stream Slot -->
        <slot name="remote" />

        <!-- Floating Local Preview (Responsive Size: 90x120px mobile -> 110x150px tablet) -->
        <div class="absolute bottom-4 right-4 z-10 w-[90px] h-[120px] md:w-[110px] md:h-[150px]">
          <slot name="local" />
        </div>

        <!-- Floating Chat Button Bottom-Left -->
        <div class="absolute bottom-4 left-4 z-10 lg:hidden">
          <slot name="chat-toggle" />
        </div>
      </div>

      <!-- Chat Sidepanel (Floating drawer overlay on Mobile, Static sidebar on Desktop) -->
      <div
        class="h-full border-l border-white/5 bg-[#0F1117]/95 backdrop-blur-xl shrink-0 transition-all duration-300 ease-in-out"
        :class="[
          isChatOpen
            ? 'absolute inset-y-0 right-0 z-20 w-[85%] sm:w-[340px] shadow-2xl flex translate-x-0'
            : 'absolute inset-y-0 right-0 z-20 w-[85%] sm:w-[340px] translate-x-full lg:static lg:flex lg:w-[360px] lg:translate-x-0'
        ]"
      >
        <slot name="chat-panel" />
      </div>
    </div>

    <!-- Bottom Controls dock -->
    <slot name="controls" />
  </main>
</template>
