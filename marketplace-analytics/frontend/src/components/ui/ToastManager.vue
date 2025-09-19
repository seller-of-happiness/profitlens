<template>
  <div>
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Toast, { type ToastProps } from './Toast.vue'

interface ToastItem extends Omit<ToastProps, 'show'> {
  id: string
}

const toasts = ref<ToastItem[]>([])

const addToast = (toast: Omit<ToastItem, 'id'>) => {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
  toasts.value.push({ ...toast, id })
  return id
}

const removeToast = (id: string) => {
  const index = toasts.value.findIndex(toast => toast.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

const showSuccess = (title: string, message?: string, duration = 5000) => {
  return addToast({ type: 'success', title, message, duration })
}

const showError = (title: string, message?: string, duration = 7000) => {
  return addToast({ type: 'error', title, message, duration })
}

const showWarning = (title: string, message?: string, duration = 6000) => {
  return addToast({ type: 'warning', title, message, duration })
}

const showInfo = (title: string, message?: string, duration = 5000) => {
  return addToast({ type: 'info', title, message, duration })
}

const clear = () => {
  toasts.value = []
}

defineExpose({
  addToast,
  removeToast,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  clear,
})
</script>