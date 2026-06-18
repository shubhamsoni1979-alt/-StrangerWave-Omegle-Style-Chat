<script setup lang="ts">
import { ref } from "vue";
import MessageList from "./MessageList.vue";
import type { ChatMessage } from "~/types/webrtc";

const props = defineProps<{
  messages: ChatMessage[];
  strangerIsTyping: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{
  send: [text: string];
  typing: [];
}>();

const draft = ref("");
const MAX_LENGTH = 500;

function submit(): void {
  const text = draft.value.trim();
  if (!text || props.disabled) return;
  emit("send", text);
  draft.value = "";
}

function onInput(): void {
  if (draft.value.length > 0) emit("typing");
}
</script>

<template>
  <div class="flex h-full flex-col rounded-xl bg-neutral-900/60 ring-1 ring-white/10">
    <MessageList :messages="messages" :stranger-is-typing="strangerIsTyping" class="min-h-0 flex-1" />

    <form class="flex items-center gap-2 border-t border-white/10 p-2" @submit.prevent="submit">
      <UInput
        v-model="draft"
        :disabled="disabled"
        :maxlength="MAX_LENGTH"
        placeholder="Type a message…"
        class="flex-1"
        size="md"
        @input="onInput"
      />
      <UButton type="submit" :disabled="disabled || !draft.trim()" icon="i-heroicons-paper-airplane" color="primary" />
    </form>
  </div>
</template>
