<template>
  <BaseModal v-model="localModelValue" :title="title" size="sm">
    <div class="flex items-center mb-4">
      <div class="flex-shrink-0">
        <ExclamationTriangleIcon 
          class="h-6 w-6"
          :class="iconColorClass"
        />
      </div>
      <div class="ml-3">
        <p class="text-sm text-gray-700">{{ message }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <BaseButton
          variant="outline"
          @click="handleCancel"
        >
          {{ cancelText }}
        </BaseButton>
        <BaseButton
          :variant="confirmVariant"
          @click="handleConfirm"
          :loading="loading"
        >
          {{ confirmText }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

interface Props {
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger' | 'success'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Подтвердить',
  cancelText: 'Отмена',
  confirmVariant: 'primary',
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const localModelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const iconColorClass = computed(() => {
  const colors = {
    primary: 'text-blue-600',
    danger: 'text-red-600',
    success: 'text-green-600'
  }
  return colors[props.confirmVariant]
})

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>