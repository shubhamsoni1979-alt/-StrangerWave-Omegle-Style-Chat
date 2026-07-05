<script setup lang="ts">
import { ref } from "vue";
import MessageList from "./MessageList.vue";
import type { ChatMessage } from "~/types/webrtc";
import { useConnectionStore } from "~/stores/connection";
import { useUserStore } from "~/stores/user";

const props = defineProps<{
  messages: ChatMessage[];
  strangerIsTyping: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{
  send: [text: string];
  typing: [];
}>();

const connectionStore = useConnectionStore();
const userStore = useUserStore();
const draft = ref("");
const MAX_LENGTH = 500;

function submit(): void {
  const text = draft.value.trim().slice(0, MAX_LENGTH);
  if (!text || props.disabled) return;
  emit("send", text);
  draft.value = "";
}

function onInput(): void {
  if (draft.value.length > MAX_LENGTH) {
    draft.value = draft.value.slice(0, MAX_LENGTH);
  }
  if (draft.value.length > 0) emit("typing");
}
</script>

<template>
  <div class="flex h-full flex-col rounded-[24px] bg-[#453ED0]/80 backdrop-blur-lg border border-white/10 shadow-2xl overflow-hidden text-white">
    <!-- Top Avatar Tabs matching screenshot -->
    <div class="flex items-center border-b border-white/10 bg-black/15 shrink-0 overflow-hidden">
      <!-- Left Tab: You -->
      <div class="flex-1 py-4 flex justify-center items-center gap-2 border-r border-white/10 bg-white/5">
        <div class="flex items-center gap-2 font-sans text-xs font-black tracking-widest text-neutral-200 uppercase">
          <UIcon name="i-heroicons-user" class="h-4 w-4 text-neutral-400" />
          <span>{{ userStore.userName || 'YOU' }}</span>
        </div>
      </div>
      <!-- Right Tab: Stranger -->
      <div class="flex-1 py-4 flex justify-center items-center gap-2 bg-transparent">
        <div class="flex items-center gap-2 font-sans text-xs font-black tracking-widest text-[#6C63FF] uppercase">
          <UIcon name="i-heroicons-chat-bubble-left-right" class="h-4 w-4 text-[#6C63FF]/70" />
          <span>{{ connectionStore.isConnected && connectionStore.partnerName ? connectionStore.partnerName : 'STRANGER' }}</span>
        </div>
      </div>
    </div>

    <!-- Scrollable Messages Stage -->
    <div class="flex-1 min-h-0 flex flex-col overflow-y-auto">
      <!-- System Message -->
      <div class="px-4 pt-4 flex justify-start">
        <div class="flex items-start gap-2.5 rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-3 text-xs text-white/95 ring-1 ring-white/10 max-w-[85%] leading-relaxed shadow-sm">
          <div class="h-5 w-5 rounded-full bg-amber-400/20 flex items-center justify-center text-xs shrink-0">🦁</div>
          <span><strong>AI shield on.</strong> Keep your match private and safe.</span>
        </div>
      </div>

      <MessageList :messages="messages" :stranger-is-typing="strangerIsTyping" class="min-h-0 flex-1" />
    </div>

    <!-- Input Bar -->
    <form 
      class="flex items-center gap-2 border-t border-white/10 p-3 bg-black/10 shrink-0"
      style="padding-bottom: calc(12px + env(safe-area-inset-bottom));"
      @submit.prevent="submit"
    >
      <div class="flex-grow relative flex items-center bg-white/10 hover:bg-white/15 focus-within:bg-white/15 transition-all rounded-full px-4 py-2 text-white">
        <input
          v-model="draft"
          :disabled="disabled"
          :maxlength="MAX_LENGTH"
          type="text"
          placeholder="Send Message"
          class="flex-1 bg-transparent text-sm focus:outline-none placeholder-white/40 disabled:opacity-50"
          @input="onInput"
        />
        
        <!-- Emoji button -->
        <button type="button" class="text-neutral-400 hover:text-white transition-colors duration-200 ml-2 shrink-0">
          <span class="text-base select-none">😊</span>
        </button>

        <!-- Gift button -->
        <button type="button" class="text-neutral-400 hover:text-white transition-colors duration-200 ml-2 shrink-0">
          <span class="text-base select-none">🎁</span>
        </button>
      </div>

      <UButton 
        type="submit" 
        :disabled="disabled || !draft.trim()" 
        icon="i-heroicons-paper-airplane" 
        color="white" 
        variant="ghost"
        class="rounded-full shadow-md text-white hover:text-[#6C63FF] shrink-0"
      />
    </form>
  </div>
</template>
