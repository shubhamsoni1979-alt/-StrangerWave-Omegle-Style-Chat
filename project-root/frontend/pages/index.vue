<script setup lang="ts">
import { useUserStore } from "~/stores/user";

const userStore = useUserStore();
const router = useRouter();
const agreedToAge = ref(false);
const agreedToRules = ref(false);

const canEnter = computed(() => agreedToAge.value && agreedToRules.value);

function enterChat(): void {
  if (!canEnter.value) return;
  userStore.acceptTerms();
  router.push("/chat");
}

function enterGroupChat(): void {
  if (!canEnter.value) return;
  userStore.acceptTerms();
  router.push("/group");
}
</script>

<template>
  <main 
    class="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-8 text-neutral-100 overflow-y-auto w-full"
    style="padding-top: max(32px, env(safe-area-inset-top)); padding-bottom: max(32px, env(safe-area-inset-bottom));"
  >
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold tracking-tight">
          Stranger<span class="text-primary-400">Wave</span>
        </h1>
        <p class="mt-2 text-sm text-neutral-400">
          Random video chat with someone new, anywhere in the world. No signup, no profile.
        </p>
      </div>

      <div class="space-y-4 rounded-2xl bg-neutral-900 p-6 ring-1 ring-white/10">
        <h2 class="text-sm font-semibold text-neutral-200">Before you start</h2>

        <UCheckbox
          v-model="agreedToAge"
          label="I confirm that I am at least 18 years old."
          class="text-sm text-neutral-300"
        />

        <UCheckbox
          v-model="agreedToRules"
          label="I agree not to share nudity, sexual content, hate speech, or anything illegal, and I understand strangers can be reported and disconnected instantly."
          class="text-sm text-neutral-300"
        />

        <div class="flex flex-col gap-3">
          <UButton block size="lg" color="primary" :disabled="!canEnter" @click="enterChat">
            Start 1-on-1 chatting
          </UButton>
          <UButton block size="lg" color="amber" variant="soft" :disabled="!canEnter" @click="enterGroupChat">
            Group Video Call (Direct)
          </UButton>
        </div>

        <p class="text-center text-xs text-neutral-500">
          This site doesn't store messages or video. Conversations end the moment you leave.
        </p>
      </div>
    </div>
  </main>
</template>
