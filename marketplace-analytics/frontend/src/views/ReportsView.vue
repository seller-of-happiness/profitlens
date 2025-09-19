<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-5">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Отчеты</h1>
          <p class="mt-1 text-sm text-gray-600">
            Управление загруженными отчетами и их анализ
          </p>
        </div>
        <div class="flex items-center space-x-3">
          <BaseButton
            variant="outline"
            :icon="ArrowPathIcon"
            @click="loadReports"
            :loading="loading"
          >
            Обновить
          </BaseButton>
          <BaseButton
            variant="primary"
            :icon="CloudArrowUpIcon"
            @click="$router.push('/upload')"
          >
            Загрузить отчет
          </BaseButton>
          <BaseButton
            variant="danger"
            :icon="TrashIcon"
            @click="confirmDeleteAll"
            :disabled="reports.length === 0"
          >
            Очистить все
          </BaseButton>
          <BaseButton
            variant="danger"
            :icon="ExclamationTriangleIcon"
            @click="confirmResetStatistics"
            :disabled="reports.length === 0"
          >
            Сбросить статистику
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Маркетплейс</label>
          <select
            v-model="filters.marketplace"
            @change="applyFilters"
            class="form-input"
          >
            <option value="">Все маркетплейсы</option>
            <option value="WILDBERRIES">Wildberries</option>
            <option value="OZON">Ozon</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Статус</label>
          <select
            v-model="filters.processed"
            @change="applyFilters"
            class="form-input"
          >
            <option value="">Все статусы</option>
            <option value="true">Обработан</option>
            <option value="false">В обработке</option>
          </select>
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" />
        <input
          v-model="searchQuery"
          @input="applyFilters"
          type="text"
          placeholder="Поиск по названию файла..."
          class="form-input"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading && reports.length === 0" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading && reports.length === 0 && !hasFilters" class="text-center py-12">
      <CloudArrowUpIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">Нет отчетов</h3>
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

    <!-- No results state -->
    <div v-else-if="!loading && filteredReports.length === 0 && hasFilters" class="text-center py-12">
      <DocumentMagnifyingGlassIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">Нет результатов</h3>
      <p class="mt-1 text-sm text-gray-500">
        Попробуйте изменить параметры поиска или фильтры
      </p>
      <div class="mt-6">
        <BaseButton
          variant="outline"
          @click="clearFilters"
        >
          Очистить фильтры
        </BaseButton>
      </div>
    </div>

    <!-- Reports Grid -->
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div 
          v-for="report in filteredReports" 
          :key="report.id"
          class="card hover:shadow-lg transition-shadow cursor-pointer"
          @click="$router.push(`/reports/${report.id}`)"
        >
          <div class="card-body">
            <!-- Report Header -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <DocumentTextIcon 
                    class="h-6 w-6"
                    :class="report.processed ? 'text-green-500' : 'text-yellow-500'"
                  />
                  <span 
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getMarketplaceColor(report.marketplace)"
                  >
                    {{ formatMarketplace(report.marketplace) }}
                  </span>
                </div>
                <h3 class="text-sm font-medium text-gray-900 truncate" :title="report.fileName">
                  {{ report.fileName }}
                </h3>
              </div>
              
              <div class="flex items-center space-x-1" @click.stop>
                <BaseButton
                  variant="outline"
                  size="sm"
                  :icon="EyeIcon"
                  @click="$router.push(`/reports/${report.id}`)"
                  title="Просмотреть"
                />
                <BaseButton
                  variant="outline"
                  size="sm"
                  :icon="ArrowUpTrayIcon"
                  @click="openReplaceDialog(report)"
                  title="Заменить"
                />
                <BaseButton
                  variant="danger"
                  size="sm"
                  :icon="TrashIcon"
                  @click="confirmDelete(report)"
                  title="Удалить"
                />
              </div>
            </div>

            <!-- Report Stats -->
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div class="text-gray-500">Записей</div>
                  <div class="font-medium">{{ report._count?.salesData || 0 }}</div>
                </div>
                <div>
                  <div class="text-gray-500">Статус</div>
                  <div class="flex items-center space-x-1">
                    <div 
                      class="w-2 h-2 rounded-full"
                      :class="report.processed ? 'bg-green-500' : 'bg-yellow-500'"
                    ></div>
                    <span>{{ report.processed ? 'Обработан' : 'В обработке' }}</span>
                  </div>
                </div>
              </div>

              <!-- Revenue and Profit (if available) -->
              <div v-if="report.totalRevenue || report.totalProfit" class="pt-2 border-t border-gray-200">
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div v-if="report.totalRevenue">
                    <div class="text-gray-500">Выручка</div>
                    <div class="font-medium text-blue-600">{{ formatCurrency(report.totalRevenue) }}</div>
                  </div>
                  <div v-if="report.totalProfit">
                    <div class="text-gray-500">Прибыль</div>
                    <div 
                      class="font-medium"
                      :class="report.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'"
                    >
                      {{ formatCurrency(report.totalProfit) }}
                    </div>
                  </div>
                </div>
                <div v-if="report.profitMargin" class="mt-2 text-sm">
                  <div class="text-gray-500">Маржинальность</div>
                  <div 
                    class="font-medium"
                    :class="report.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ report.profitMargin.toFixed(1) }}%
                  </div>
                </div>
              </div>

              <!-- Upload Date -->
              <div class="pt-2 border-t border-gray-200 text-xs text-gray-500">
                Загружен: {{ formatDate(report.uploadDate) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Stats -->
      <div v-if="filteredReports.length > 0" class="card">
        <div class="card-header">
          <h3 class="text-lg font-medium text-gray-900">Сводка по отчетам</h3>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{ filteredReports.length }}</div>
              <div class="text-sm text-gray-500">Всего отчетов</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">{{ processedReportsCount }}</div>
              <div class="text-sm text-gray-500">Обработано</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-yellow-600">{{ processingReportsCount }}</div>
              <div class="text-sm text-gray-500">В обработке</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-600">{{ totalSalesRecords }}</div>
              <div class="text-sm text-gray-500">Записей продаж</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-indigo-600">{{ formatCurrency(totalRevenue) }}</div>
              <div class="text-sm text-gray-500">Общая выручка</div>
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
          Заменить отчет "{{ selectedReport?.fileName }}" новым файлом?
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

  <!-- Confirmation Modals -->
  <ConfirmationModal
    v-model="showDeleteConfirm"
    title="Удалить отчет"
    :message="`Вы уверены, что хотите удалить отчет '${selectedReport?.fileName}'? Это действие нельзя отменить.`"
    confirm-text="Удалить"
    confirm-variant="danger"
    @confirm="handleDelete"
  />

  <ConfirmationModal
    v-model="showDeleteAllConfirm"
    title="Удалить все отчеты"
    message="Вы уверены, что хотите удалить ВСЕ отчеты? Это действие нельзя отменить и приведет к потере всех данных."
    confirm-text="Удалить все"
    confirm-variant="danger"
    @confirm="handleDeleteAll"
  />

  <ConfirmationModal
    v-model="showResetStatisticsConfirm"
    title="Сбросить всю статистику"
    message="Вы уверены, что хотите ПОЛНОСТЬЮ СБРОСИТЬ всю статистику? Это действие удалит ВСЕ отчеты и данные продаж безвозвратно!"
    confirm-text="Сбросить статистику"
    confirm-variant="danger"
    @confirm="handleResetStatistics"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { uploadsService } from '@/services/uploads'
import { analyticsService } from '@/services/analytics'
import { useToast } from '@/composables/useToast'
import type { Report, Marketplace } from '@shared/types'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import FileUpload from '@/components/ui/FileUpload.vue'
import {
  DocumentTextIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import { DocumentMagnifyingGlassIcon } from '@heroicons/vue/24/solid'

const router = useRouter()
const { showSuccess, showError } = useToast()

// Reactive data
const reports = ref<Report[]>([])
const loading = ref(false)
const selectedReport = ref<Report | null>(null)

// Filters
const filters = ref({
  marketplace: '',
  processed: '',
})
const searchQuery = ref('')

// Replace modal
const showReplaceModal = ref(false)
const replaceMarketplace = ref<Marketplace | ''>('')
const replaceFiles = ref<File[]>([])
const replaceError = ref('')
const replacing = ref(false)
const replaceFileUploadRef = ref()

// Confirmation modals
const showDeleteConfirm = ref(false)
const showDeleteAllConfirm = ref(false)
const showResetStatisticsConfirm = ref(false)

// Computed properties
const hasFilters = computed(() => {
  return filters.value.marketplace || filters.value.processed || searchQuery.value
})

const filteredReports = computed(() => {
  let filtered = [...reports.value]

  // Marketplace filter
  if (filters.value.marketplace) {
    filtered = filtered.filter(report => report.marketplace === filters.value.marketplace)
  }

  // Status filter
  if (filters.value.processed) {
    const isProcessed = filters.value.processed === 'true'
    filtered = filtered.filter(report => report.processed === isProcessed)
  }

  // Search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(report => 
      report.fileName.toLowerCase().includes(query)
    )
  }

  return filtered
})

const processedReportsCount = computed(() => {
  return filteredReports.value.filter(report => report.processed).length
})

const processingReportsCount = computed(() => {
  return filteredReports.value.filter(report => !report.processed).length
})

const totalSalesRecords = computed(() => {
  return filteredReports.value.reduce((sum, report) => sum + (report._count?.salesData || 0), 0)
})

const totalRevenue = computed(() => {
  return filteredReports.value.reduce((sum, report) => sum + (report.totalRevenue || 0), 0)
})

const canReplace = computed(() => {
  return replaceMarketplace.value && replaceFiles.value.length > 0 && !replacing.value
})

// Methods
const loadReports = async () => {
  try {
    loading.value = true
    reports.value = await uploadsService.getReports()
  } catch (error) {
    console.error('Error loading reports:', error)
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  // Filters are automatically applied via computed property
}

const clearFilters = () => {
  filters.value = {
    marketplace: '',
    processed: '',
  }
  searchQuery.value = ''
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

// Delete operations
const confirmDelete = (report: Report) => {
  selectedReport.value = report
  showDeleteConfirm.value = true
}

const confirmDeleteAll = () => {
  showDeleteAllConfirm.value = true
}

const confirmResetStatistics = () => {
  showResetStatisticsConfirm.value = true
}

const handleDelete = async () => {
  if (!selectedReport.value) return

  try {
    await uploadsService.deleteReport(selectedReport.value.id)
    await loadReports()
    showDeleteConfirm.value = false
    showSuccess('Отчет удален', `Отчет "${selectedReport.value.fileName}" успешно удален`)
    selectedReport.value = null
  } catch (error: any) {
    console.error('Error deleting report:', error)
    showError('Ошибка удаления', error.response?.data?.message || 'Не удалось удалить отчет')
  }
}

const handleDeleteAll = async () => {
  try {
    const result = await uploadsService.deleteAllReports()
    await loadReports()
    showDeleteAllConfirm.value = false
    showSuccess('Все отчеты удалены', 'Все отчеты были успешно удалены')
  } catch (error: any) {
    console.error('Error deleting all reports:', error)
    showError('Ошибка удаления', error.response?.data?.message || 'Не удалось удалить отчеты')
  }
}

const handleResetStatistics = async () => {
  try {
    const result = await analyticsService.clearStatistics()
    console.log('Statistics reset:', result)
    await loadReports()
    showResetStatisticsConfirm.value = false
    
    showSuccess(
      'Статистика сброшена', 
      `Удалено отчетов: ${result.deletedReports}, записей продаж: ${result.deletedSalesData}`
    )
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  } catch (error: any) {
    console.error('Error resetting statistics:', error)
    showError('Ошибка сброса', error.response?.data?.message || 'Не удалось сбросить статистику')
    showResetStatisticsConfirm.value = false
  }
}

// Replace operations
const openReplaceDialog = (report: Report) => {
  selectedReport.value = report
  replaceMarketplace.value = report.marketplace as Marketplace
  replaceFiles.value = []
  replaceError.value = ''
  showReplaceModal.value = true
}

const closeReplaceDialog = () => {
  showReplaceModal.value = false
  selectedReport.value = null
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
  if (!canReplace.value || !selectedReport.value) return

  try {
    replacing.value = true
    replaceError.value = ''

    await uploadsService.replaceReport(
      selectedReport.value.id,
      replaceFiles.value[0],
      replaceMarketplace.value as Marketplace
    )

    await loadReports()
    closeReplaceDialog()
    showSuccess('Отчет заменен', `Файл "${selectedReport.value.fileName}" успешно заменен`)
  } catch (err: any) {
    replaceError.value = err.response?.data?.message || 'Произошла ошибка при замене файла'
    showError('Ошибка замены', replaceError.value)
  } finally {
    replacing.value = false
  }
}

// Initialize
onMounted(() => {
  loadReports()
})
</script>