import { ref } from 'vue'

interface ToastItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  autoClose?: boolean
}

const toasts = ref<ToastItem[]>([])

export function useToast() {
  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newToast: ToastItem = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
      autoClose: toast.autoClose ?? true,
    }
    toasts.value.push(newToast)
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

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clear,
  }
}