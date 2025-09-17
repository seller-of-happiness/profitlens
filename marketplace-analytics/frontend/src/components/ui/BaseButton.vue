<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-3 h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    
    <component v-if="icon && !loading" :is="icon" :class="iconClasses" />
    
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  icon?: any
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  fullWidth: false,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

const slots = useSlots()

const baseClasses = 'inline-flex items-center justify-center border font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

const variantClasses = {
  primary: 'border-transparent bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'border-transparent bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
  success: 'border-transparent bg-success-600 text-white hover:bg-success-700 focus:ring-success-500',
  danger: 'border-transparent bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500',
  outline: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500',
}

const sizeClasses = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const buttonClasses = computed(() => [
  baseClasses,
  variantClasses[props.variant],
  sizeClasses[props.size],
  props.fullWidth ? 'w-full' : '',
])

const iconClasses = computed(() => {
  const hasText = !!slots.default
  return [
    'h-5 w-5',
    hasText ? (props.size === 'sm' ? 'mr-1.5' : 'mr-2') : '',
  ]
})
</script>