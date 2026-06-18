<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
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

function triggerMockStranger(): void {
  chatStore.clear();
  connectionStore.setBotMatched(); // Set matched and botMode = true!
  matchmaking.remoteStream.value = null; // Clear remote video stream so we show the bot avatar image
  
  setTimeout(() => {
    chatStore.setStrangerTyping(true);
  }, 1000);

  setTimeout(() => {
    chatStore.setStrangerTyping(false);
    chatStore.addMessage({
      id: `mock-1-${Date.now()}`,
      text: "Hello there! I am WaveBot, your simulated companion. How can I help you today? 🤖",
      at: Date.now(),
      from: "stranger"
    });
  }, 3000);
}

function handleSendMessage(text: string): void {
  matchmaking.sendMessage(text);
  if (connectionStore.isBotMode) {
    simulateBotReply(text);
  }
}

function simulateBotReply(userText: string): void {
  setTimeout(() => {
    chatStore.setStrangerTyping(true);
  }, 800);

  setTimeout(() => {
    chatStore.setStrangerTyping(false);
    
    const text = userText.toLowerCase();
    let reply = "I'm not sure how to respond to that, but it's great chatting with you!";
    
    if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
      reply = "Hey! Hope you're having an awesome day. 😊";
    } else if (text.includes("how are you")) {
      reply = "I'm doing great! Just sitting here in the server, waiting to talk to cool developers like you. How are you?";
    } else if (text.includes("good") || text.includes("fine") || text.includes("great")) {
      reply = "Awesome to hear! Glad things are going well. 👍";
    } else if (text.includes("camera") || text.includes("video") || text.includes("mic")) {
      reply = "Yes! I can see you clearly in your camera feed. My feed is static because I'm a bot, but it looks like your layout is working perfectly!";
    } else if (text.includes("name")) {
      reply = "My name is WaveBot! I'm StrangerWave's built-in simulation assistant.";
    } else if (text.includes("bye") || text.includes("quit") || text.includes("exit")) {
      reply = "Goodbye! Click the 'End' button to return to the home screen or 'Next' to search again.";
    } else {
      const genericReplies = [
        "That's really interesting! Tell me more.",
        "Aha! I see. You're testing the chat system, and it seems to be working perfectly!",
        "Double-check your controls panel (camera, mute) to see how they work dynamically.",
        "I'm powered by Vue 3 and Nuxt. Pretty sleek, right?",
        "If you want to match with real people, open an incognito tab and match with yourself!",
      ];
      reply = genericReplies[Math.floor(Math.random() * genericReplies.length)];
    }

    chatStore.addMessage({
      id: `bot-reply-${Date.now()}`,
      text: reply,
      at: Date.now(),
      from: "stranger"
    });
  }, 2200);
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
            :is-bot-mode="connectionStore.isBotMode"
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
            color="amber"
            variant="soft"
            icon="i-heroicons-beaker"
            @click="triggerMockStranger"
          >
            Simulate Partner
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
