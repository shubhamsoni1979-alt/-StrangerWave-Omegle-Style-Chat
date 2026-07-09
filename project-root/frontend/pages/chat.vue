<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useConnectionStore } from "~/stores/connection";
import { useChatStore } from "~/stores/chat";
import { useUserStore } from "~/stores/user";

const router = useRouter();
const userStore = useUserStore();
const connectionStore = useConnectionStore();
const chatStore = useChatStore();
const toast = useToast();

useHead({
  bodyAttrs: {
    class: "overflow-hidden w-full h-full select-none"
  }
});

const matchmaking = useMatchmaking();
const localStream = matchmaking.localStream;
const remoteStream = matchmaking.remoteStream;

const isChatOpen = ref(false);
const unreadCount = ref(0);

onMounted(async () => {
  if (!userStore.hasAcceptedTerms) {
    router.replace("/");
    return;
  }
  try {
    await matchmaking.start();
  } catch {
    toast.add({
      title: "Camera/microphone access is required",
      description: "Allow camera and microphone permissions, then try again.",
      color: "red",
    });
  }
});

onBeforeUnmount(() => {
  matchmaking.endChat();
});

function handleNext(): void {
  matchmaking.findNext();
  // Close mobile chat on next matchmaking to make video active
  isChatOpen.value = false;
}

function handleEnd(): void {
  matchmaking.endChat();
  router.push("/");
}

function handleReport(): void {
  matchmaking.reportPartner("user-flagged");
  toast.add({ title: "Reported", description: "Thanks — we've disconnected you from that stranger." });
}

function toggleCamera(): void {
  userStore.toggleCamera();
  matchmaking.setCameraEnabled(userStore.isCameraOn);
}

function toggleMic(): void {
  userStore.toggleMic();
  matchmaking.setMicEnabled(userStore.isMicOn);
}

function handleSendMessage(text: string): void {
  matchmaking.sendMessage(text);
}

// Watch for incoming messages when chat panel is closed
watch(
  () => chatStore.messages.length,
  (newLength, oldLength) => {
    if (newLength > oldLength && !isChatOpen.value) {
      const lastMessage = chatStore.messages[newLength - 1];
      if (lastMessage && lastMessage.from === "stranger") {
        unreadCount.value++;
      }
    }
  }
);

// Clear unread counts once chat is opened
watch(isChatOpen, (open) => {
  if (open) {
    unreadCount.value = 0;
  }
});
</script>

<template>
  <VideoChatLayout :is-chat-open="isChatOpen">
    <!-- Header Slot -->
    <template #header>
      <Header />
    </template>

    <!-- Remote Video Slot -->
    <template #remote>
      <RemoteVideo
        :stream="remoteStream"
        :is-connected="connectionStore.isConnected"
        :is-searching="connectionStore.isSearching"
        class="h-full w-full"
        @next="handleNext"
      />
    </template>

    <!-- Floating Local Preview Slot -->
    <template #local>
      <LocalPreview
        :stream="localStream"
        :camera-on="userStore.isCameraOn"
        class="h-full w-full"
      />
    </template>

    <!-- Floating Mobile Chat Toggle Button Slot -->
    <template #chat-toggle>
      <ChatButton
        :unread-count="unreadCount"
        @click="isChatOpen = !isChatOpen"
      />
    </template>

    <!-- Chat sidebar / slide drawer panel slot -->
    <template #chat-panel>
      <div class="flex flex-col h-full w-full relative">
        <!-- Close overlay button visible only on mobile -->
        <button
          v-if="isChatOpen"
          type="button"
          class="absolute top-3.5 left-3.5 z-30 lg:hidden flex h-8 w-8 items-center justify-center rounded-full bg-black/60 border border-white/10 text-neutral-300 transition-all duration-200 active:scale-95 shadow-md hover:text-white"
          aria-label="Close chat"
          @click="isChatOpen = false"
        >
          <UIcon name="i-heroicons-chevron-right" class="h-4 w-4" />
        </button>

        <ChatBox
          :messages="chatStore.messages"
          :stranger-is-typing="chatStore.strangerIsTyping"
          :disabled="!connectionStore.isMatched"
          @send="handleSendMessage"
          @typing="matchmaking.notifyTyping"
          class="h-full w-full"
        />
      </div>
    </template>

    <!-- Bottom Controls dock slot -->
    <template #controls>
      <ControlBar
        :camera-on="userStore.isCameraOn"
        :mic-on="userStore.isMicOn"
        :is-searching="connectionStore.isSearching"
        :is-connected="connectionStore.isConnected"
        @toggle-camera="toggleCamera"
        @toggle-mic="toggleMic"
        @next="handleNext"
        @end="handleEnd"
        @report="handleReport"
      />
    </template>
  </VideoChatLayout>
</template>
