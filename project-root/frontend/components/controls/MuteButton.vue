<script setup lang="ts">
defineProps<{ micOn: boolean }>();
const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <UButton
    :color="micOn ? 'gray' : 'red'"
    variant="soft"
    :icon="micOn ? 'i-heroicons-microphone' : 'i-heroicons-no-symbol'"
    :aria-label="micOn ? 'Mute microphone' : 'Unmute microphone'"
    @click="emit('toggle')"
  />
</template>
