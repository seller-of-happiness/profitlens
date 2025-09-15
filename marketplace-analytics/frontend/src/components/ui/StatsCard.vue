<template>
  <div class="card">
    <div class="card-body">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div :class="iconWrapperClasses">
            <component :is="icon" class="h-6 w-6" />
          </div>
        </div>
        
        <div class="ml-5 w-0 flex-1">
          <dl>
            <dt class="text-sm font-medium text-gray-500 truncate">{{ title }}</dt>
            <dd class="flex items-baseline">
              <div class="text-2xl font-semibold text-gray-900">{{ formattedValue }}</div>
              <div v-if="change !== undefined" :class="changeClasses" class="ml-2 flex items-baseline text-sm font-semibold">
                <component :is="changeIcon" class="self-center flex-shrink-0 h-5 w-5" />
                <span class="sr-only">{{ change >= 0 ? 'Увеличение' : 'Снижение' }} на </span>
                {{ Math.abs(change) }}%
              </div>
            </dd>
          </dl>
        </div>
      </div>
      
      <div v-if="description" class="mt-3">
        <p class="text-sm text-gray-600">{{ description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/24/solid'

interface Props {
  title: string
  value: number | string
  icon: any
  change?: number
  description?: string
  format?: 'number' | 'currency' | 'percentage'
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
}

const props = withDefaults(defineProps<Props>(), {
  format: 'number',
  color: 'blue',
})

const colorClasses = {
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-500 text-white',
  purple: 'bg-purple-500 text-white',
}

const iconWrapperClasses = computed(() => [
  'flex items-center justify-center h-10 w-10 rounded-md',
  colorClasses[props.color],
])

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  
  switch (props.format) {
    case 'currency':
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(props.value)
    case 'percentage':
      return `${props.value.toFixed(1)}%`
    case 'number':
    default:
      return new Intl.NumberFormat('ru-RU').format(props.value)
  }
})

const changeIcon = computed(() => {
  return props.change !== undefined && props.change >= 0 ? ArrowUpIcon : ArrowDownIcon
})

const changeClasses = computed(() => {
  if (props.change === undefined) return ''
  return props.change >= 0 ? 'text-green-600' : 'text-red-600'
})
</script>