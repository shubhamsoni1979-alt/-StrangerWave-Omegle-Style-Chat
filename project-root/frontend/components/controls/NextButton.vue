<script setup lang="ts">
defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ click: [] }>();
</script>

<template>
  <UButton
    color="primary"
    variant="solid"
    icon="i-heroicons-forward"
    :disabled="disabled"
    @click="emit('click')"
  >
    Next
  </UButton>
</template>
