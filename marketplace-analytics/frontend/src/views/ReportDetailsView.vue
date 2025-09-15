<template>
  <div class="space-y-6">
    <div class="border-b border-gray-200 pb-5">
      <h1 class="text-2xl font-bold text-gray-900">Детали отчета</h1>
      <p class="mt-1 text-sm text-gray-600">
        Подробная информация об отчете {{ $route.params.id }}
      </p>
    </div>

    <!-- Coming soon placeholder -->
    <div class="text-center py-12">
      <DocumentTextIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">Раздел в разработке</h3>
      <p class="mt-1 text-sm text-gray-500">
        Детали отчетов будут доступны в ближайшее время
      </p>
      <div class="mt-6">
        <BaseButton
          variant="primary"
          @click="$router.push('/reports')"
        >
          Вернуться к отчетам
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DocumentTextIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
</script>