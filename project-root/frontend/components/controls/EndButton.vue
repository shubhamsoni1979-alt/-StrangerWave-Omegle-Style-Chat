<script setup lang="ts">
const emit = defineEmits<{ click: [] }>();
</script>

<template>
  <UButton color="red" variant="soft" icon="i-heroicons-x-mark" @click="emit('click')">
    Stop
  </UButton>
</template>
