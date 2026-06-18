<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { ChatMessage } from "~/types/webrtc";

const props = defineProps<{
  messages: ChatMessage[];
  strangerIsTyping: boolean;
}>();

const listEl = ref<HTMLDivElement | null>(null);

watch(
  () => [props.messages.length, props.strangerIsTyping],
  async () => {
    await nextTick();
    listEl.value?.scrollTo({ top: listEl.value.scrollHeight, behavior: "smooth" });
  }
);

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
</script>

<template>
  <div ref="listEl" class="flex h-full flex-col gap-2 overflow-y-auto px-3 py-2">
    <div v-if="messages.length === 0" class="m-auto text-center text-sm text-neutral-500">
      Say hi! Messages disappear when the chat ends.
    </div>

    <div
      v-for="message in messages"
      :key="message.id"
      class="flex"
      :class="message.from === 'me' ? 'justify-end' : 'justify-start'"
    >
      <div
        class="max-w-[80%] rounded-2xl px-3 py-1.5 text-sm leading-relaxed"
        :class="
          message.from === 'me'
            ? 'bg-primary-500/90 text-white rounded-br-sm'
            : 'bg-neutral-800 text-neutral-100 rounded-bl-sm'
        "
      >
        <p class="whitespace-pre-wrap break-words">{{ message.text }}</p>
        <span class="mt-0.5 block text-right text-[10px] opacity-60">{{ formatTime(message.at) }}</span>
      </div>
    </div>

    <div v-if="strangerIsTyping" class="flex justify-start">
      <div class="flex items-center gap-1 rounded-2xl bg-neutral-800 px-3 py-2">
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
      </div>
    </div>
  </div>
</template>
