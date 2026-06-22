<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { useGroupWebRTC } from "~/composables/useGroupWebRTC";
import { useUserStore } from "~/stores/user";

const router = useRouter();
const userStore = useUserStore();
const toast = useToast();

const groupCall = useGroupWebRTC();
const friendIdOrCode = ref("");
const chatInput = ref("");
const activeTab = ref("chat"); // or participants

const messagesEl = ref<HTMLDivElement | null>(null);

watch(
  () => [groupCall.messages.value.length, activeTab.value],
  async () => {
    await nextTick();
    if (messagesEl.value) {
      messagesEl.value.scrollTo({ top: messagesEl.value.scrollHeight, behavior: "smooth" });
    }
  }
);

const isCameraOn = ref(true);
const isMicOn = ref(true);

onMounted(() => {
  if (!userStore.hasAcceptedTerms) {
    router.replace("/");
    return;
  }
  // Immediately initialize socket connection to retrieve User ID
  groupCall.initSocket();
});

onBeforeUnmount(() => {
  groupCall.teardown();
});

async function handleJoinCall() {
  const code = friendIdOrCode.value.trim();
  if (!code) {
    toast.add({ title: "Error", description: "Please enter a Friend's ID or Group Code.", color: "red" });
    return;
  }
  try {
    await groupCall.joinRoom(code);
  } catch (err) {
    toast.add({ title: "Camera access required", description: "Please allow camera and mic permissions.", color: "red" });
  }
}

function handleSendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  groupCall.sendGroupMessage(text);
  chatInput.value = "";
}

function toggleCamera() {
  isCameraOn.value = !isCameraOn.value;
  groupCall.setCameraEnabled(isCameraOn.value);
}

function toggleMic() {
  isMicOn.value = !isMicOn.value;
  groupCall.setMicEnabled(isMicOn.value);
}

function handleLeave() {
  groupCall.leaveRoom();
}

function copyRoomCode() {
  if (typeof navigator !== "undefined") {
    navigator.clipboard.writeText(groupCall.roomCode.value);
    toast.add({ title: "Copied!", description: "Room code copied to clipboard." });
  }
}
</script>

<template>
  <main class="flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden font-sans" style="height: var(--vh, 100vh);">
    <!-- Header -->
    <header 
      class="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0 bg-neutral-950/80 backdrop-blur"
      style="padding-top: calc(12px + env(safe-area-inset-top)); padding-left: calc(16px + env(safe-area-inset-left)); padding-right: calc(16px + env(safe-area-inset-right));"
    >
      <h1 class="text-base font-semibold">
        Stranger<span class="text-amber-400">Wave</span> <span class="ml-2 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300 font-normal">Group</span>
      </h1>
      <div v-if="groupCall.roomCode.value" class="flex items-center gap-2">
        <span class="text-xs text-neutral-400">Room Code:</span>
        <span class="text-sm font-mono font-bold text-amber-400 bg-neutral-900 px-2 py-1 rounded border border-white/10">{{ groupCall.roomCode.value }}</span>
        <UButton size="xs" variant="ghost" color="gray" icon="i-heroicons-clipboard" @click="copyRoomCode" />
      </div>
      <div v-else class="text-xs text-neutral-400 flex items-center gap-2">
        <span>Your ID:</span>
        <span class="text-sm font-mono font-bold text-neutral-200 bg-neutral-900 px-2 py-0.5 rounded border border-white/5">{{ groupCall.myUserId.value || 'Connecting...' }}</span>
      </div>
    </header>

    <!-- Setup View -->
    <div v-if="!groupCall.roomCode.value" class="flex flex-1 flex-col items-center justify-center p-6">
      <div class="w-full max-w-md space-y-6">
        <div class="text-center space-y-2">
          <h2 class="text-2xl font-bold text-neutral-100">Friend & Group Calling</h2>
          <p class="text-sm text-neutral-400">Share your ID with friends or join a call by entering their User ID or Room Code.</p>
        </div>

        <div class="rounded-2xl bg-neutral-900/60 p-6 ring-1 ring-white/10 space-y-6 backdrop-blur">
          <div class="flex flex-col items-center justify-center p-3 bg-neutral-950 rounded-xl ring-1 ring-white/5 text-center">
            <span class="text-xs uppercase tracking-wider text-neutral-500 font-bold mb-1">Your Direct User ID</span>
            <span class="text-3xl font-mono font-black text-amber-400 tracking-wider">
              {{ groupCall.myUserId.value || '------' }}
            </span>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-semibold text-neutral-300">Enter Friend's ID / Group Code</label>
            <UInput
              v-model="friendIdOrCode"
              placeholder="e.g. 123456"
              size="lg"
              icon="i-heroicons-key"
              class="w-full font-mono text-center tracking-widest text-lg animate-pulse"
              @keyup.enter="handleJoinCall"
            />
          </div>

          <div class="flex gap-3 pt-2">
            <UButton block size="lg" color="amber" class="flex-1" icon="i-heroicons-phone" @click="handleJoinCall">
              Start / Join Call
            </UButton>
            <UButton size="lg" color="gray" variant="ghost" icon="i-heroicons-home" @click="router.push('/')">
              Home
            </UButton>
          </div>
          
          <p v-if="groupCall.connectionError.value" class="text-xs text-red-400 text-center font-medium">
            {{ groupCall.connectionError.value }}
          </p>
        </div>
      </div>
    </div>

    <!-- Active Call View -->
    <div 
      v-else 
      class="flex flex-col flex-1 min-h-0 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid lg:grid-cols-[1fr_360px] lg:h-[calc(100vh-60px)] lg:min-h-0 lg:overflow-hidden"
      style="padding-left: calc(12px + env(safe-area-inset-left)); padding-right: calc(12px + env(safe-area-inset-right));"
    >
      <!-- Video Grid Section -->
      <section class="flex flex-col gap-3 min-h-0 shrink-0 h-[38%] sm:h-[45%] lg:h-full lg:min-h-0 lg:flex-1">
        <!-- 4-Video layout grid -->
        <div class="grid grid-cols-2 grid-rows-2 gap-3 flex-1 min-h-0">
          <!-- Local video -->
          <GroupVideo
            :stream="groupCall.localStream.value"
            label="You"
            :is-muted="true"
            class="w-full h-full object-cover"
          />

          <!-- Remote videos -->
          <template v-for="peer in groupCall.participants.value" :key="peer.socketId">
            <GroupVideo
              :stream="groupCall.remoteStreams.value[peer.socketId] || null"
              :label="`User ${peer.userId}`"
              class="w-full h-full object-cover"
            />
          </template>

          <!-- Placeholders if less than 4 screens -->
          <template v-for="n in Math.max(0, 3 - groupCall.participants.value.length)" :key="n">
            <div class="relative w-full h-full overflow-hidden rounded-xl bg-neutral-900/30 border border-white/5 border-dashed flex flex-col items-center justify-center gap-2 text-neutral-600">
              <UIcon name="i-heroicons-user-plus" class="h-8 w-8 opacity-40 animate-pulse" />
              <span class="text-xs">Waiting for friend...</span>
            </div>
          </template>
        </div>

        <!-- Controls panel -->
        <div class="flex flex-wrap items-center justify-center gap-3 rounded-xl bg-neutral-900/60 p-3 ring-1 ring-white/10 shrink-0">
          <CameraButton :camera-on="isCameraOn" @toggle="toggleCamera" />
          <MuteButton :mic-on="isMicOn" @toggle="toggleMic" />
          <EndButton label="Leave Call" @click="handleLeave" />
        </div>
      </section>

      <!-- Chat and Participants sidebar -->
      <section class="flex flex-col flex-1 min-h-0 lg:h-full rounded-xl bg-neutral-900/40 border border-white/10 overflow-hidden">
        <div class="flex border-b border-white/10 bg-neutral-900/60">
          <button
            class="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-r border-white/10"
            :class="activeTab === 'chat' ? 'text-amber-400 bg-neutral-950/40' : 'text-neutral-400 hover:text-neutral-200'"
            @click="activeTab = 'chat'"
          >
            Chat
          </button>
          <button
            class="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center"
            :class="activeTab === 'participants' ? 'text-amber-400 bg-neutral-950/40' : 'text-neutral-400 hover:text-neutral-200'"
            @click="activeTab = 'participants'"
          >
            People ({{ groupCall.participants.value.length + 1 }})
          </button>
        </div>

        <!-- Tab: Chat -->
        <div v-show="activeTab === 'chat'" class="flex flex-1 flex-col min-h-0">
          <!-- Messages Box -->
          <div ref="messagesEl" class="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            <div
              v-for="msg in groupCall.messages.value"
              :key="msg.id"
              class="flex flex-col"
              :class="msg.fromUserId === 'System' ? 'items-center py-1' : msg.isMe ? 'items-end' : 'items-start'"
            >
              <!-- System message -->
              <span v-if="msg.fromUserId === 'System'" class="text-[10px] text-neutral-500 font-medium bg-neutral-950 px-2 py-0.5 rounded-full border border-white/5">
                {{ msg.text }}
              </span>

              <!-- Chat bubbles -->
              <div v-else class="flex flex-col max-w-[80%]">
                <span class="text-[10px] text-neutral-500 mb-0.5 px-1" :class="msg.isMe ? 'text-right' : 'text-left'">
                  {{ msg.isMe ? 'You' : `User ${msg.fromUserId}` }}
                </span>
                <div
                  class="rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
                  :class="msg.isMe ? 'bg-amber-500 text-neutral-950 rounded-tr-none' : 'bg-neutral-800 text-neutral-200 rounded-tl-none'"
                >
                  {{ msg.text }}
                </div>
              </div>
            </div>
          </div>

          <!-- Input bar -->
          <div 
            class="p-3 border-t border-white/10 bg-neutral-950/40 flex items-center gap-2"
            style="padding-bottom: calc(12px + env(safe-area-inset-bottom)); padding-left: calc(12px + env(safe-area-inset-left)); padding-right: calc(12px + env(safe-area-inset-right));"
          >
            <UInput
              v-model="chatInput"
              placeholder="Message group..."
              class="flex-1"
              @keyup.enter="handleSendMessage"
            />
            <UButton color="amber" icon="i-heroicons-paper-airplane" @click="handleSendMessage" />
          </div>
        </div>

        <!-- Tab: Participants -->
        <div v-show="activeTab === 'participants'" class="flex-1 overflow-y-auto p-4 space-y-3">
          <div class="flex items-center gap-3 px-3 py-2 bg-neutral-950/45 rounded-xl border border-white/5">
            <div class="h-2 w-2 rounded-full bg-green-500" />
            <span class="text-sm font-mono font-bold text-amber-400">User {{ groupCall.myUserId.value }}</span>
            <span class="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded uppercase font-semibold ml-auto font-sans">You</span>
          </div>

          <div
            v-for="peer in groupCall.participants.value"
            :key="peer.socketId"
            class="flex items-center gap-3 px-3 py-2 bg-neutral-950/20 rounded-xl border border-white/5"
          >
            <div class="h-2 w-2 rounded-full bg-green-500" />
            <span class="text-sm font-mono text-neutral-200">User {{ peer.userId }}</span>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
