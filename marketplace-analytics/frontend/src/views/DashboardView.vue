<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-5">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Дашборд</h1>
          <p class="mt-1 text-sm text-gray-600">
            Обзор ваших продаж и аналитики
          </p>
        </div>
        <div class="flex items-center space-x-3">
          <select
            v-model="selectedPeriod"
            @change="loadAnalytics"
            class="form-input"
          >
            <option value="7d">Последние 7 дней</option>
            <option value="30d">Последние 30 дней</option>
            <option value="90d">Последние 90 дней</option>
          </select>
          
          <BaseButton
            variant="primary"
            :icon="ArrowPathIcon"
            @click="loadAnalytics"
            :loading="loading"
          >
            Обновить
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading && !analytics" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading && !analytics" class="text-center py-12">
      <CloudArrowUpIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">Нет данных</h3>
      <p class="mt-1 text-sm text-gray-500">
        Загрузите первый отчет для начала работы с аналитикой
      </p>
      <div class="mt-6">
        <BaseButton
          variant="primary"
          @click="$router.push('/upload')"
        >
          Загрузить файл
        </BaseButton>
      </div>
    </div>

    <!-- Analytics content -->
    <div v-else class="space-y-6">
      <!-- Reports Manager -->
      <ReportsManager @reports-updated="loadAnalytics" />
      <!-- Stats cards -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Общая выручка"
          :value="analytics?.totalRevenue || 0"
          format="currency"
          color="blue"
          :icon="CurrencyDollarIcon"
          description="За выбранный период"
        />
        
        <StatsCard
          title="Чистая прибыль"
          :value="analytics?.totalProfit || 0"
          format="currency"
          color="green"
          :icon="ArrowTrendingUpIcon"
          description="После всех комиссий"
        />
        
        <StatsCard
          title="Маржинальность"
          :value="analytics?.profitMargin || 0"
          format="percentage"
          color="purple"
          :icon="ChartBarIcon"
          description="Средняя по всем товарам"
        />
        
        <StatsCard
          title="Количество заказов"
          :value="analytics?.totalOrders || 0"
          format="number"
          color="yellow"
          :icon="ShoppingBagIcon"
          description="Общее количество продаж"
        />
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Revenue chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="text-lg font-medium text-gray-900">Динамика продаж</h3>
          </div>
          <div class="card-body">
            <LineChart
              v-if="analytics?.dailySales && analytics.dailySales.length > 0"
              :data="chartData"
              :options="chartOptions"
            />
            <div v-else class="text-center py-8 text-gray-500">
              Недостаточно данных для отображения графика
            </div>
          </div>
        </div>

        <!-- Expense breakdown -->
        <div class="card">
          <div class="card-header">
            <h3 class="text-lg font-medium text-gray-900">Структура расходов</h3>
          </div>
          <div class="card-body">
            <PieChart
              v-if="expenseData.datasets[0].data.some(value => value > 0)"
              :data="expenseData"
              :options="pieChartOptions"
            />
            <div v-else class="text-center py-8 text-gray-500">
              Нет данных о расходах
            </div>
          </div>
        </div>
      </div>

      <!-- Top products -->
      <div class="card">
        <div class="card-header">
          <h3 class="text-lg font-medium text-gray-900">Топ товаров по прибыли</h3>
        </div>
        <div class="card-body">
          <div v-if="analytics?.topProducts && analytics.topProducts.length > 0" class="overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Товар
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Выручка
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Прибыль
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Маржа
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Количество
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="product in analytics?.topProducts || []" :key="product.sku">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ product.productName }}</div>
                      <div class="text-sm text-gray-500">{{ product.sku }}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatCurrency(product.revenue) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span :class="product.profit >= 0 ? 'text-green-600' : 'text-red-600'">
                      {{ formatCurrency(product.profit) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span :class="product.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'">
                      {{ product.profitMargin.toFixed(1) }}%
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ product.quantity }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            Нет данных о товарах
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { analyticsService } from '@/services/analytics'
import type { AnalyticsData } from '@shared/types'
import StatsCard from '@/components/ui/StatsCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LineChart from '@/components/charts/LineChart.vue'
import PieChart from '@/components/charts/PieChart.vue'
import ReportsManager from '@/components/dashboard/ReportsManager.vue'
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ShoppingBagIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/outline'

const analytics = ref<AnalyticsData | null>(null)
const loading = ref(false)
const selectedPeriod = ref('30d')

const chartData = computed(() => {
  if (!analytics.value?.dailySales) return { labels: [], datasets: [] }

  const labels = analytics.value.dailySales.map(item => 
    new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
  )
  
  return {
    labels,
    datasets: [
      {
        label: 'Выручка',
        data: analytics.value.dailySales.map(item => item.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Прибыль',
        data: analytics.value.dailySales.map(item => item.profit),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
    ],
  }
})

const expenseData = computed(() => {
  if (!analytics.value?.expenseBreakdown) return { labels: [], datasets: [] }

  const breakdown = analytics.value.expenseBreakdown
  
  return {
    labels: ['Комиссии', 'Логистика', 'Хранение', 'Возвраты'],
    datasets: [
      {
        data: [
          breakdown.commission,
          breakdown.logistics,
          breakdown.storage,
          breakdown.returns,
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(156, 163, 175, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value: any) {
          return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)
        }
      }
    },
  },
}

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          const label = context.label || ''
          const value = formatCurrency(context.parsed)
          return `${label}: ${value}`
        }
      }
    }
  },
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const loadAnalytics = async () => {
  try {
    loading.value = true
    analytics.value = await analyticsService.getDashboardAnalytics(selectedPeriod.value)
  } catch (error) {
    console.error('Error loading analytics:', error)
    analytics.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAnalytics()
})
</script>