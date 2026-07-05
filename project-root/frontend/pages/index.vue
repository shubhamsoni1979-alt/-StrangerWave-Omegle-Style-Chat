<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useUserStore } from "~/stores/user";
import { useConnectionStore } from "~/stores/connection";

const userStore = useUserStore();
const connectionStore = useConnectionStore();
const router = useRouter();
const config = useRuntimeConfig();

const countries = [
  { name: "India", flag: "🇮🇳" },
  { name: "United States", flag: "🇺🇸" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "France", flag: "🇫🇷" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "Singapore", flag: "🇸🇬" },
  { name: "South Africa", flag: "🇿🇦" }
];

const nameInput = ref("");
const selectedCountry = ref(countries[0]);
const agreedToAge = ref(false);
const agreedToRules = ref(false);

const canEnter = computed(() => 
  agreedToAge.value && 
  agreedToRules.value && 
  nameInput.value.trim().length > 0
);

onMounted(async () => {
  let url = getBackendUrl(config.public.backendUrl);
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  try {
    const res = await $fetch<{ count: number }>("/api/online-count", {
      baseURL: url,
    });
    if (res && typeof res.count === "number") {
      connectionStore.setOnlineCount(res.count);
    }
  } catch (err) {
    console.error("Failed to fetch online count:", err);
  }
});

function enterChat(): void {
  if (!canEnter.value) return;
  userStore.setIdentity(nameInput.value, selectedCountry.value.name, selectedCountry.value.flag);
  userStore.acceptTerms();
  router.push("/chat");
}

function enterGroupChat(): void {
  if (!canEnter.value) return;
  userStore.setIdentity(nameInput.value, selectedCountry.value.name, selectedCountry.value.flag);
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

        <!-- Live Online Users Badge -->
        <div v-if="connectionStore.onlineCount > 0" class="mt-4 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 font-sans text-xs font-semibold text-green-400">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
          </span>
          {{ connectionStore.onlineCount }} {{ connectionStore.onlineCount === 1 ? 'person' : 'people' }} online now
        </div>
      </div>

      <div class="space-y-4 rounded-2xl bg-neutral-900 p-6 ring-1 ring-white/10">
        <h2 class="text-sm font-semibold text-neutral-200">Before you start</h2>

        <!-- Name Input -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-neutral-300">Your Display Name</label>
          <UInput
            v-model="nameInput"
            placeholder="Enter your name..."
            size="lg"
            icon="i-heroicons-user"
            class="bg-neutral-950/40 rounded-xl"
          />
        </div>

        <!-- Country Selection -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-neutral-300">Your Country</label>
          <USelectMenu
            v-model="selectedCountry"
            :options="countries"
            option-attribute="name"
            size="lg"
            class="bg-neutral-950/40 rounded-xl"
          >
            <template #label>
              <span class="flex items-center gap-2">
                <span>{{ selectedCountry.flag }}</span>
                <span>{{ selectedCountry.name }}</span>
              </span>
            </template>
            <template #option="{ option }">
              <span class="flex items-center gap-2">
                <span>{{ option.flag }}</span>
                <span>{{ option.name }}</span>
              </span>
            </template>
          </USelectMenu>
        </div>

        <UCheckbox
          v-model="agreedToAge"
          label="I confirm that I am at least 18 years old."
          class="text-sm text-neutral-300 pt-2"
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
