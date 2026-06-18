<script setup lang="ts">
defineProps<{ cameraOn: boolean }>();
const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <UButton
    :color="cameraOn ? 'gray' : 'red'"
    variant="soft"
    :icon="cameraOn ? 'i-heroicons-video-camera' : 'i-heroicons-video-camera-slash'"
    :aria-label="cameraOn ? 'Turn camera off' : 'Turn camera on'"
    @click="emit('toggle')"
  />
</template>
