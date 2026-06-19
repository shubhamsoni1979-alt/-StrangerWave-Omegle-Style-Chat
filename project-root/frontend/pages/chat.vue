<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useConnectionStore } from "~/stores/connection";
import { useChatStore } from "~/stores/chat";
import { useUserStore } from "~/stores/user";

const router = useRouter();
const userStore = useUserStore();
const connectionStore = useConnectionStore();
const chatStore = useChatStore();
const toast = useToast();

const matchmaking = useMatchmaking();
const localStream = matchmaking.localStream;
const remoteStream = matchmaking.remoteStream;

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
</script>

<template>
  <main class="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
    <header class="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <h1 class="text-base font-semibold">
        Stranger<span class="text-primary-400">Wave</span>
      </h1>
      <div class="flex items-center gap-4">
        <MatchStatus :status="connectionStore.status" />
        <ConnectionStatus />
      </div>
    </header>

    <div class="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_360px] lg:h-[calc(100vh-60px)] lg:min-h-0 lg:overflow-hidden">
      <section class="flex flex-col gap-4 lg:h-full lg:min-h-0">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:min-h-0">
          <RemoteVideo
            :stream="remoteStream"
            :is-connected="connectionStore.isConnected"
            :is-searching="connectionStore.isSearching"
          />
          <LocalVideo :stream="localStream" :camera-on="userStore.isCameraOn" />
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3 rounded-xl bg-neutral-900/60 p-3 ring-1 ring-white/10 shrink-0">
          <CameraButton :camera-on="userStore.isCameraOn" @toggle="toggleCamera" />
          <MuteButton :mic-on="userStore.isMicOn" @toggle="toggleMic" />
          <NextButton :disabled="connectionStore.isSearching" @click="handleNext" />
          <EndButton @click="handleEnd" />
          <UButton
            variant="ghost"
            color="gray"
            icon="i-heroicons-flag"
            :disabled="!connectionStore.isMatched"
            @click="handleReport"
          >
            Report
          </UButton>
          <UButton
            variant="ghost"
            color="amber"
            icon="i-heroicons-users"
            @click="router.push('/group')"
          >
            Group Call
          </UButton>
        </div>
      </section>

      <section class="min-h-[320px] lg:min-h-0 lg:h-full">
        <ChatBox
          :messages="chatStore.messages"
          :stranger-is-typing="chatStore.strangerIsTyping"
          :disabled="!connectionStore.isMatched"
          @send="handleSendMessage"
          @typing="matchmaking.notifyTyping"
          class="h-full"
        />
      </section>
    </div>
  </main>
</template>
