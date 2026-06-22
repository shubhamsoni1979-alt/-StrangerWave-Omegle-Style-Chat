<script setup lang="ts">
defineProps<{
  unreadCount?: number;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    type="button"
    class="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-white/20 select-none cursor-pointer"
    aria-label="Toggle chat panel"
    @click="emit('click')"
  >
    <UIcon name="i-heroicons-chat-bubble-left-right" class="h-5 w-5" />

    <!-- Unread Messages Badge -->
    <span
      v-if="unreadCount && unreadCount > 0"
      class="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-[#6C63FF] to-[#4F7CFF] px-1 text-[9px] font-black text-white ring-2 ring-[#0F1117] animate-pulse"
    >
      {{ unreadCount }}
    </span>
  </button>
</template>
