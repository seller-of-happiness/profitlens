<template>
  <div>
    <div class="mb-6">
      <h2 class="text-center text-2xl font-bold text-gray-900">Создать аккаунт</h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Зарегистрируйтесь для начала работы с аналитикой
      </p>
    </div>

    <form @submit.prevent="handleRegister" class="space-y-6">
      <BaseInput
        id="name"
        v-model="form.name"
        label="Имя"
        placeholder="Ваше имя"
        :error="errors.name"
        :icon="UserIcon"
      />

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
        hint="Минимум 6 символов"
      />

      <BaseInput
        id="confirmPassword"
        v-model="form.confirmPassword"
        label="Подтвердите пароль"
        type="password"
        placeholder="••••••••"
        required
        :error="errors.confirmPassword"
        :icon="LockClosedIcon"
      />

      <div class="flex items-center">
        <input
          id="agree-terms"
          v-model="form.agreeTerms"
          name="agree-terms"
          type="checkbox"
          class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label for="agree-terms" class="ml-2 block text-sm text-gray-900">
          Я согласен с
          <a href="#" class="text-primary-600 hover:text-primary-500">условиями использования</a>
          и
          <a href="#" class="text-primary-600 hover:text-primary-500">политикой конфиденциальности</a>
        </label>
      </div>
      <div v-if="errors.agreeTerms" class="text-sm text-red-600">{{ errors.agreeTerms }}</div>

      <BaseButton
        type="submit"
        variant="primary"
        :loading="loading"
        :disabled="!isFormValid"
        full-width
      >
        Создать аккаунт
      </BaseButton>

      <div v-if="error" class="rounded-md bg-red-50 p-4">
        <div class="flex">
          <ExclamationTriangleIcon class="h-5 w-5 text-red-400" />
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Ошибка регистрации</h3>
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
import { UserIcon, EnvelopeIcon, LockClosedIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
})

const errors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: '',
})

const loading = ref(false)
const error = ref('')

const isFormValid = computed(() => {
  return (
    form.email &&
    form.password &&
    form.confirmPassword &&
    form.agreeTerms &&
    !Object.values(errors).some(error => error)
  )
})

const validateForm = () => {
  // Reset errors
  Object.keys(errors).forEach(key => {
    errors[key as keyof typeof errors] = ''
  })

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

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Подтверждение пароля обязательно'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Пароли не совпадают'
  }

  if (!form.agreeTerms) {
    errors.agreeTerms = 'Необходимо согласиться с условиями использования'
  }

  return !Object.values(errors).some(error => error)
}

const handleRegister = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    error.value = ''
    
    await authStore.register({
      email: form.email,
      password: form.password,
      name: form.name || undefined,
    })
    
    router.push('/')
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Произошла ошибка при регистрации'
  } finally {
    loading.value = false
  }
}
</script>