<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // Инициализация аутентификации при загрузке приложения
  authStore.initAuth()
})
</script>

<style scoped>
#app {
  min-height: 100vh;
}
</style>