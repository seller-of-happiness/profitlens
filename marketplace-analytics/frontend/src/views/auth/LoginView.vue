<template>
  <div>
    <div class="mb-6">
      <h2 class="text-center text-2xl font-bold text-gray-900">Вход в систему</h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Войдите в свой аккаунт для доступа к аналитике
      </p>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-6">
      <BaseInput
        id="email"
        v-model="form.email"
        label="Email"
        type="email"
        placeholder="your@email.com"
        required
        :error="errors.email"
        :icon="EnvelopeIcon"
      />

      <BaseInput
        id="password"
        v-model="form.password"
        label="Пароль"
        type="password"
        placeholder="••••••••"
        required
        :error="errors.password"
        :icon="LockClosedIcon"
      />

      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label for="remember-me" class="ml-2 block text-sm text-gray-900">
            Запомнить меня
          </label>
        </div>

        <div class="text-sm">
          <a href="#" class="font-medium text-primary-600 hover:text-primary-500">
            Забыли пароль?
          </a>
        </div>
      </div>

      <BaseButton
        type="submit"
        variant="primary"
        :loading="loading"
        :disabled="!isFormValid"
        full-width
      >
        Войти
      </BaseButton>

      <div v-if="error" class="rounded-md bg-red-50 p-4">
        <div class="flex">
          <ExclamationTriangleIcon class="h-5 w-5 text-red-400" />
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Ошибка входа</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { EnvelopeIcon, LockClosedIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: '',
})

const errors = reactive({
  email: '',
  password: '',
})

const loading = ref(false)
const error = ref('')

const isFormValid = computed(() => {
  return form.email && form.password && !errors.email && !errors.password
})

const validateForm = () => {
  errors.email = ''
  errors.password = ''

  if (!form.email) {
    errors.email = 'Email обязателен'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Некорректный формат email'
  }

  if (!form.password) {
    errors.password = 'Пароль обязателен'
  } else if (form.password.length < 6) {
    errors.password = 'Пароль должен содержать минимум 6 символов'
  }

  return !errors.email && !errors.password
}

const handleLogin = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    error.value = ''
    
    await authStore.login({
      email: form.email,
      password: form.password,
    })
    
    router.push('/')
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Произошла ошибка при входе'
  } finally {
    loading.value = false
  }
}
</script>