<script setup lang="ts">
useViewportHeight();
</script>

<template>
  <div class="app-container">
    <NuxtLoadingIndicator color="#6366f1" />
    <NuxtPage />
    <UNotifications />
  </div>
</template>

<style>
html,
body,
#__nuxt,
.app-container {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: fixed;
  background-image: linear-gradient(135deg, rgba(29, 23, 61, 0.95), rgba(79, 124, 255, 0.15)), url('/monkey_chat_bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Ensure nice smooth scrollbars for message boxes */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
