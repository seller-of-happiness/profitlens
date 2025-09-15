<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="text-center">
      <div class="mx-auto h-24 w-24 text-gray-400">
        <ExclamationTriangleIcon />
      </div>
      <h1 class="mt-6 text-6xl font-bold text-gray-900">404</h1>
      <h2 class="mt-2 text-3xl font-bold text-gray-900">Страница не найдена</h2>
      <p class="mt-2 text-base text-gray-600">
        Извините, мы не смогли найти страницу, которую вы ищете.
      </p>
      <div class="mt-6">
        <BaseButton
          variant="primary"
          @click="$router.push('/')"
        >
          Вернуться на главную
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
</script>