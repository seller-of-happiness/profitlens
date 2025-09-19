<template>
  <div id="app">
    <router-view />
    <!-- Toast Notifications -->
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        :show="true"
        :type="toast.type"
        :title="toast.title"
        :message="toast.message"
        :duration="toast.duration"
        :auto-close="toast.autoClose"
        @close="removeToast(toast.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import Toast from '@/components/ui/Toast.vue'

const authStore = useAuthStore()
const { toasts, removeToast } = useToast()

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