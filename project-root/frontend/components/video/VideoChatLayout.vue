<script setup lang="ts">
defineProps<{
  isChatOpen: boolean;
}>();
</script>

<template>
  <main
    class="flex flex-col bg-transparent text-neutral-100 overflow-hidden select-none w-full"
    style="height: var(--vh, 100vh);"
  >
    <!-- Top Header Position -->
    <slot name="header" />

    <!-- Main Workspace (Desktop 3-Column side-by-side, Mobile Full Screen Overlay) -->
    <div class="flex-grow min-h-0 w-full overflow-hidden relative flex flex-col">
      
      <!-- Desktop Layout: 3 Columns side-by-side -->
      <div class="hidden lg:grid lg:grid-cols-[1.1fr_1.1fr_1fr] gap-6 flex-grow min-h-0 max-w-6xl mx-auto px-6 w-full items-center">
        <!-- Column 1: Local Video -->
        <div class="h-[95%] min-h-0 w-full rounded-[24px] overflow-hidden bg-neutral-900/60 backdrop-blur-md ring-1 ring-white/10 shadow-2xl relative">
          <slot name="local" />
        </div>

        <!-- Column 2: Remote Video with overlays -->
        <div class="relative h-[95%] min-h-0 w-full rounded-[24px] overflow-hidden bg-neutral-900/60 backdrop-blur-md ring-1 ring-white/10 shadow-2xl">
          <slot name="remote" />
        </div>

        <!-- Column 3: Chat panel -->
        <div class="h-[95%] min-h-0 w-full rounded-[24px] overflow-hidden bg-neutral-900/60 backdrop-blur-md ring-1 ring-white/10 shadow-2xl">
          <slot name="chat-panel" />
        </div>
      </div>

      <!-- Mobile/Tablet Layout: Stacked vertically or side-by-side -->
      <div class="lg:hidden relative w-full h-full flex flex-col sm:flex-row flex-grow min-h-0 overflow-hidden gap-3 p-3">
        <!-- Local Video (top on mobile, left on tablet) -->
        <div class="w-full h-[48%] sm:h-full sm:w-[49%] rounded-2xl overflow-hidden bg-neutral-900 ring-1 ring-white/10 relative shrink-0 shadow-lg">
          <slot name="local" />
        </div>

        <!-- Remote Video (bottom on mobile, right on tablet) -->
        <div class="w-full h-[48%] sm:h-full sm:w-[49%] rounded-2xl overflow-hidden bg-neutral-900 ring-1 ring-white/10 relative shrink-0 shadow-lg">
          <slot name="remote" />
        </div>

        <!-- Floating Chat Button -->
        <div class="absolute bottom-6 left-6 z-15">
          <slot name="chat-toggle" />
        </div>

        <!-- Floating Chat Drawer Panel overlay -->
        <div
          class="absolute inset-y-0 right-0 z-20 w-[85%] sm:w-[340px] border-l border-white/5 bg-[#0F1117]/95 backdrop-blur-xl shrink-0 transition-transform duration-300 ease-in-out shadow-2xl"
          :class="isChatOpen ? 'translate-x-0' : 'translate-x-full'"
        >
          <slot name="chat-panel" />
        </div>
      </div>

    </div>

    <!-- Bottom Controls dock (positioned responsively) -->
    <div class="w-full relative z-10 lg:mb-6 lg:z-30 lg:w-auto lg:mx-auto pointer-events-auto flex justify-center shrink-0">
      <slot name="controls" />
    </div>
  </main>
</template>
