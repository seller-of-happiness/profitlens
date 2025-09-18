<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-5">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center space-x-3">
            <BaseButton
              variant="outline"
              size="sm"
              :icon="ArrowLeftIcon"
              @click="$router.push('/reports')"
            >
              Назад к отчетам
            </BaseButton>
            <h1 class="text-2xl font-bold text-gray-900">Детали отчета</h1>
          </div>
          <p v-if="report" class="mt-1 text-sm text-gray-600">
            {{ report.fileName }}
          </p>
        </div>
        
        <div v-if="report" class="flex items-center space-x-3">
          <BaseButton
            variant="outline"
            :icon="ArrowPathIcon"
            @click="loadReport"
            :loading="loading"
          >
            Обновить
          </BaseButton>
          <BaseButton
            variant="outline"
            :icon="ArrowUpTrayIcon"
            @click="openReplaceDialog"
          >
            Заменить файл
          </BaseButton>
          <BaseButton
            variant="danger"
            :icon="TrashIcon"
            @click="confirmDelete"
          >
            Удалить отчет
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-12">
      <ExclamationTriangleIcon class="mx-auto h-12 w-12 text-red-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">Ошибка загрузки</h3>
      <p class="mt-1 text-sm text-gray-500">{{ error }}</p>
      <div class="mt-6 space-x-3">
        <BaseButton variant="outline" @click="loadReport">
          Попробовать еще раз
        </BaseButton>
        <BaseButton variant="primary" @click="$router.push('/reports')">
          Вернуться к отчетам
        </BaseButton>
      </div>
    </div>

    <!-- Report Content -->
    <div v-else-if="report" class="space-y-6">
      <!-- Report Info Card -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">Информация об отчете</h3>
            <div class="flex items-center space-x-2">
              <span 
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getMarketplaceColor(report.marketplace)"
              >
                {{ formatMarketplace(report.marketplace) }}
              </span>
              <span 
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="report.processed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
              >
                {{ report.processed ? 'Обработан' : 'В обработке' }}
              </span>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt class="text-sm font-medium text-gray-500">Файл</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ report.fileName }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Дата загрузки</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ formatDate(report.uploadDate) }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Записей продаж</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ report.salesData?.length || 0 }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Статус обработки</dt>
              <dd class="mt-1 flex items-center space-x-1">
                <div 
                  class="w-2 h-2 rounded-full"
                  :class="report.processed ? 'bg-green-500' : 'bg-yellow-500'"
                ></div>
                <span class="text-sm text-gray-900">
                  {{ report.processed ? 'Обработан' : 'В обработке' }}
                </span>
              </dd>
            </div>
          </div>
        </div>
      </div>

      <!-- Analytics Card -->
      <div v-if="analytics" class="card">
        <div class="card-header">
          <h3 class="text-lg font-medium text-gray-900">Аналитика отчета</h3>
        </div>
        <div class="card-body">
          <!-- Stats Grid -->
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatsCard
              title="Общая выручка"
              :value="analytics.totalRevenue || 0"
              format="currency"
              color="blue"
              :icon="CurrencyDollarIcon"
            />
            <StatsCard
              title="Чистая прибыль"
              :value="analytics.totalProfit || 0"
              format="currency"
              color="green"
              :icon="ArrowTrendingUpIcon"
            />
            <StatsCard
              title="Маржинальность"
              :value="analytics.profitMargin || 0"
              format="percentage"
              color="purple"
              :icon="ChartBarIcon"
            />
            <StatsCard
              title="Количество заказов"
              :value="analytics.totalOrders || 0"
              format="number"
              color="yellow"
              :icon="ShoppingBagIcon"
            />
          </div>

          <!-- Charts -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- Daily Sales Chart -->
            <div v-if="analytics.dailySales && analytics.dailySales.length > 0">
              <h4 class="text-sm font-medium text-gray-900 mb-3">Динамика продаж по дням</h4>
              <LineChart :data="dailySalesChartData" :options="chartOptions" />
            </div>
            
            <!-- Expense Breakdown -->
            <div v-if="analytics.expenseBreakdown">
              <h4 class="text-sm font-medium text-gray-900 mb-3">Структура расходов</h4>
              <PieChart :data="expenseChartData" :options="pieChartOptions" />
            </div>
          </div>
        </div>
      </div>

      <!-- Top Products -->
      <div v-if="analytics?.topProducts && analytics.topProducts.length > 0" class="card">
        <div class="card-header">
          <h3 class="text-lg font-medium text-gray-900">Топ товаров по прибыли</h3>
        </div>
        <div class="card-body">
          <div class="overflow-hidden">
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
                <tr v-for="product in analytics.topProducts" :key="product.sku">
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
        </div>
      </div>

      <!-- Sales Data Table -->
      <div v-if="report.salesData && report.salesData.length > 0" class="card">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">Данные продаж</h3>
            <div class="flex items-center space-x-2">
              <input
                v-model="salesSearchQuery"
                type="text"
                placeholder="Поиск по SKU или названию..."
                class="form-input"
              />
              <select
                v-model="salesPerPage"
                class="form-input"
              >
                <option value="10">10 на странице</option>
                <option value="25">25 на странице</option>
                <option value="50">50 на странице</option>
                <option value="100">100 на странице</option>
              </select>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" @click="sortBy('sku')">
                    SKU
                    <ChevronUpDownIcon class="inline h-4 w-4 ml-1" />
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" @click="sortBy('productName')">
                    Название товара
                    <ChevronUpDownIcon class="inline h-4 w-4 ml-1" />
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" @click="sortBy('saleDate')">
                    Дата продажи
                    <ChevronUpDownIcon class="inline h-4 w-4 ml-1" />
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" @click="sortBy('quantity')">
                    Количество
                    <ChevronUpDownIcon class="inline h-4 w-4 ml-1" />
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" @click="sortBy('price')">
                    Цена
                    <ChevronUpDownIcon class="inline h-4 w-4 ml-1" />
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" @click="sortBy('revenue')">
                    Выручка
                    <ChevronUpDownIcon class="inline h-4 w-4 ml-1" />
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" @click="sortBy('netProfit')">
                    Прибыль
                    <ChevronUpDownIcon class="inline h-4 w-4 ml-1" />
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" @click="sortBy('profitMargin')">
                    Маржа %
                    <ChevronUpDownIcon class="inline h-4 w-4 ml-1" />
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="sale in paginatedSalesData" :key="sale.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ sale.sku }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ sale.productName }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatDate(sale.saleDate) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ sale.quantity }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatCurrency(sale.price) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatCurrency(sale.revenue) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span :class="sale.netProfit >= 0 ? 'text-green-600' : 'text-red-600'">
                      {{ formatCurrency(sale.netProfit) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span :class="sale.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'">
                      {{ sale.profitMargin.toFixed(1) }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div v-if="totalSalesPages > 1" class="flex items-center justify-between mt-4">
            <div class="text-sm text-gray-700">
              Показано {{ ((currentSalesPage - 1) * salesPerPage) + 1 }}-{{ Math.min(currentSalesPage * salesPerPage, filteredSalesData.length) }} из {{ filteredSalesData.length }} записей
            </div>
            <div class="flex items-center space-x-2">
              <BaseButton
                variant="outline"
                size="sm"
                :disabled="currentSalesPage === 1"
                @click="currentSalesPage--"
              >
                Предыдущая
              </BaseButton>
              <span class="text-sm text-gray-700">
                Страница {{ currentSalesPage }} из {{ totalSalesPages }}
              </span>
              <BaseButton
                variant="outline"
                size="sm"
                :disabled="currentSalesPage === totalSalesPages"
                @click="currentSalesPage++"
              >
                Следующая
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Replace Report Modal -->
  <BaseModal 
    v-model="showReplaceModal" 
    title="Заменить отчет"
    size="md"
  >
    <div class="space-y-4">
      <div>
        <p class="text-sm text-gray-600 mb-4">
          Заменить отчет "{{ report?.fileName }}" новым файлом?
        </p>
        
        <div>
          <label class="form-label">Маркетплейс</label>
          <div class="mt-2 space-y-2">
            <div class="flex items-center">
              <input
                id="replace-wildberries"
                v-model="replaceMarketplace"
                name="marketplace"
                type="radio"
                value="WILDBERRIES"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <label for="replace-wildberries" class="ml-3 block text-sm font-medium text-gray-700">
                Wildberries
              </label>
            </div>
            <div class="flex items-center">
              <input
                id="replace-ozon"
                v-model="replaceMarketplace"
                name="marketplace"
                type="radio"
                value="OZON"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <label for="replace-ozon" class="ml-3 block text-sm font-medium text-gray-700">
                Ozon
              </label>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <label class="form-label">Новый файл</label>
          <FileUpload
            ref="replaceFileUploadRef"
            accept=".xlsx,.xls,.csv"
            :max-size="52428800"
            @files-selected="onReplaceFilesSelected"
            @error="onReplaceError"
          />
        </div>
        
        <div v-if="replaceError" class="mt-2 text-sm text-red-600">
          {{ replaceError }}
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="flex justify-end space-x-3">
        <BaseButton variant="outline" @click="closeReplaceDialog">
          Отмена
        </BaseButton>
        <BaseButton 
          variant="primary" 
          @click="handleReplace"
          :loading="replacing"
          :disabled="!canReplace"
        >
          Заменить
        </BaseButton>
      </div>
    </template>
  </BaseModal>

  <!-- Confirmation Modal -->
  <ConfirmationModal
    v-model="showDeleteConfirm"
    title="Удалить отчет"
    :message="`Вы уверены, что хотите удалить отчет '${report?.fileName}'? Это действие нельзя отменить.`"
    confirm-text="Удалить"
    confirm-variant="danger"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { uploadsService } from '@/services/uploads'
import { analyticsService } from '@/services/analytics'
import type { Report, Marketplace, AnalyticsData, SalesData } from '@shared/types'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import FileUpload from '@/components/ui/FileUpload.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import LineChart from '@/components/charts/LineChart.vue'
import PieChart from '@/components/charts/PieChart.vue'
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ShoppingBagIcon,
  ChevronUpDownIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

// Reactive data
const report = ref<Report | null>(null)
const analytics = ref<AnalyticsData | null>(null)
const loading = ref(false)
const error = ref('')

// Replace modal
const showReplaceModal = ref(false)
const replaceMarketplace = ref<Marketplace | ''>('')
const replaceFiles = ref<File[]>([])
const replaceError = ref('')
const replacing = ref(false)
const replaceFileUploadRef = ref()

// Delete confirmation
const showDeleteConfirm = ref(false)

// Sales data table
const salesSearchQuery = ref('')
const salesPerPage = ref(25)
const currentSalesPage = ref(1)
const sortField = ref<keyof SalesData>('saleDate')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Computed properties
const reportId = computed(() => route.params.id as string)

const filteredSalesData = computed(() => {
  if (!report.value?.salesData) return []
  
  let filtered = [...report.value.salesData]
  
  // Search filter
  if (salesSearchQuery.value) {
    const query = salesSearchQuery.value.toLowerCase()
    filtered = filtered.filter(sale => 
      sale.sku.toLowerCase().includes(query) ||
      sale.productName.toLowerCase().includes(query)
    )
  }
  
  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sortField.value]
    const bVal = b[sortField.value]
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection.value === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    
    if (aVal instanceof Date && bVal instanceof Date) {
      return sortDirection.value === 'asc'
        ? aVal.getTime() - bVal.getTime()
        : bVal.getTime() - aVal.getTime()
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection.value === 'asc' 
        ? aVal - bVal
        : bVal - aVal
    }
    
    return 0
  })
  
  return filtered
})

const totalSalesPages = computed(() => {
  return Math.ceil(filteredSalesData.value.length / salesPerPage.value)
})

const paginatedSalesData = computed(() => {
  const start = (currentSalesPage.value - 1) * salesPerPage.value
  const end = start + salesPerPage.value
  return filteredSalesData.value.slice(start, end)
})

const canReplace = computed(() => {
  return replaceMarketplace.value && replaceFiles.value.length > 0 && !replacing.value
})

// Chart data
const dailySalesChartData = computed(() => {
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

const expenseChartData = computed(() => {
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
          return formatCurrency(value)
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

// Methods
const loadReport = async () => {
  try {
    loading.value = true
    error.value = ''
    
    // Load report details and analytics in parallel
    const [reportData, analyticsData] = await Promise.all([
      uploadsService.getReport(reportId.value),
      analyticsService.getReportAnalytics(reportId.value)
    ])
    
    report.value = reportData
    analytics.value = analyticsData
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Не удалось загрузить отчет'
  } finally {
    loading.value = false
  }
}

const formatMarketplace = (marketplace: string) => {
  return marketplace === 'WILDBERRIES' ? 'Wildberries' : 'Ozon'
}

const getMarketplaceColor = (marketplace: string) => {
  return marketplace === 'WILDBERRIES' 
    ? 'bg-purple-100 text-purple-800'
    : 'bg-blue-100 text-blue-800'
}

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const sortBy = (field: keyof SalesData) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
  currentSalesPage.value = 1
}

// Delete operations
const confirmDelete = () => {
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!report.value) return

  try {
    await uploadsService.deleteReport(report.value.id)
    router.push('/reports')
  } catch (error) {
    console.error('Error deleting report:', error)
  }
}

// Replace operations
const openReplaceDialog = () => {
  if (!report.value) return
  
  replaceMarketplace.value = report.value.marketplace as Marketplace
  replaceFiles.value = []
  replaceError.value = ''
  showReplaceModal.value = true
}

const closeReplaceDialog = () => {
  showReplaceModal.value = false
  replaceMarketplace.value = ''
  replaceFiles.value = []
  replaceError.value = ''
  if (replaceFileUploadRef.value) {
    replaceFileUploadRef.value.clearFiles()
  }
}

const onReplaceFilesSelected = (files: File[]) => {
  replaceFiles.value = files
  replaceError.value = ''
}

const onReplaceError = (message: string) => {
  replaceError.value = message
}

const handleReplace = async () => {
  if (!canReplace.value || !report.value) return

  try {
    replacing.value = true
    replaceError.value = ''

    await uploadsService.replaceReport(
      report.value.id,
      replaceFiles.value[0],
      replaceMarketplace.value as Marketplace
    )

    await loadReport()
    closeReplaceDialog()
  } catch (err: any) {
    replaceError.value = err.response?.data?.message || 'Произошла ошибка при замене файла'
  } finally {
    replacing.value = false
  }
}

// Watch for route changes
watch(() => route.params.id, () => {
  if (route.params.id) {
    loadReport()
  }
}, { immediate: true })

// Watch for sales per page changes
watch(salesPerPage, () => {
  currentSalesPage.value = 1
})

// Watch for search changes
watch(salesSearchQuery, () => {
  currentSalesPage.value = 1
})
</script>