<template>
  <div class="card">
    <div class="card-header">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">Управление отчетами</h3>
        <div class="flex items-center space-x-2">
          <BaseButton
            variant="outline"
            size="sm"
            :icon="ArrowPathIcon"
            @click="loadReports"
            :loading="loading"
          >
            Обновить
          </BaseButton>
          <BaseButton
            variant="danger"
            size="sm"
            :icon="TrashIcon"
            @click="confirmDeleteAll"
            :disabled="reports.length === 0"
          >
            Удалить все отчеты
          </BaseButton>
          <BaseButton
            variant="danger"
            size="sm"
            :icon="ExclamationTriangleIcon"
            @click="confirmClearStatistics"
            :disabled="reports.length === 0"
          >
            Сбросить статистику
          </BaseButton>
        </div>
      </div>
    </div>
    
    <div class="card-body">
      <div v-if="loading && reports.length === 0" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
      
      <div v-else-if="reports.length === 0" class="text-center py-8 text-gray-500">
        <DocumentIcon class="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p>Нет загруженных отчетов</p>
      </div>
      
      <div v-else class="space-y-3">
        <div 
          v-for="report in reports" 
          :key="report.id"
          class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <div class="flex-1">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <DocumentTextIcon 
                  class="h-8 w-8"
                  :class="report.processed ? 'text-green-500' : 'text-yellow-500'"
                />
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-medium text-gray-900">{{ report.fileName }}</h4>
                <div class="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        :class="getMarketplaceClass(report.marketplace)">
                    {{ formatMarketplace(report.marketplace) }}
                  </span>
                  <span>{{ formatDate(report.uploadDate) }}</span>
                  <span v-if="report._count?.salesData" class="text-green-600 font-medium">
                    {{ report._count.salesData }} записей
                  </span>
                  <span v-if="!report.processed" class="text-yellow-600 font-medium">
                    Обрабатывается...
                  </span>
                </div>
                <div v-if="report.totalRevenue || report.totalProfit" class="flex items-center space-x-4 text-xs text-gray-600 mt-1">
                  <span v-if="report.totalRevenue" class="text-blue-600">
                    Выручка: ₽{{ formatCurrency(report.totalRevenue) }}
                  </span>
                  <span v-if="report.totalProfit" class="text-green-600">
                    Прибыль: ₽{{ formatCurrency(report.totalProfit) }}
                  </span>
                  <span v-if="report.profitMargin" class="text-purple-600">
                    Маржа: {{ report.profitMargin.toFixed(1) }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <BaseButton
              variant="outline"
              size="sm"
              :icon="EyeIcon"
              @click="$router.push(`/reports/${report.id}`)"
              title="Просмотреть отчет"
            />
            <BaseButton
              variant="outline"
              size="sm"
              :icon="ArrowUpTrayIcon"
              @click="openReplaceDialog(report)"
              title="Заменить файл"
            />
            <BaseButton
              variant="danger"
              size="sm"
              :icon="TrashIcon"
              @click="confirmDelete(report)"
              title="Удалить отчет"
            />
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
    v-model="showClearStatsConfirm"
    title="Сбросить всю статистику"
    message="Вы уверены, что хотите сбросить ВСЮ статистику? Это действие удалит все отчеты, данные продаж и файлы. Восстановить данные будет невозможно."
    confirm-text="Сбросить статистику"
    confirm-variant="danger"
    @confirm="handleClearStatistics"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { uploadsService } from '@/services/uploads'
import { analyticsService } from '@/services/analytics'
import type { Report, Marketplace } from '@shared/types'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import FileUpload from '@/components/ui/FileUpload.vue'
import {
  DocumentIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'

// Props and emits
const emit = defineEmits(['reports-updated'])

// Reactive data
const reports = ref<Report[]>([])
const loading = ref(false)
const selectedReport = ref<Report | null>(null)

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
const showClearStatsConfirm = ref(false)

// Computed
const canReplace = computed(() => {
  return replaceMarketplace.value && replaceFiles.value.length > 0 && !replacing.value
})

// Methods
const loadReports = async () => {
  try {
    loading.value = true
    reports.value = await uploadsService.getReports()
    emit('reports-updated')
  } catch (error) {
    console.error('Error loading reports:', error)
  } finally {
    loading.value = false
  }
}

const formatMarketplace = (marketplace: string) => {
  return marketplace === 'WILDBERRIES' ? 'Wildberries' : 'Ozon'
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(amount))
}

const getMarketplaceClass = (marketplace: string) => {
  return marketplace === 'WILDBERRIES' 
    ? 'bg-purple-100 text-purple-800' 
    : 'bg-blue-100 text-blue-800'
}

// Delete operations
const confirmDelete = (report: Report) => {
  selectedReport.value = report
  showDeleteConfirm.value = true
}

const confirmDeleteAll = () => {
  showDeleteAllConfirm.value = true
}

const confirmClearStatistics = () => {
  showClearStatsConfirm.value = true
}

const handleDelete = async () => {
  if (!selectedReport.value) return

  try {
    await uploadsService.deleteReport(selectedReport.value.id)
    await loadReports()
    showDeleteConfirm.value = false
    selectedReport.value = null
  } catch (error) {
    console.error('Error deleting report:', error)
  }
}

const handleDeleteAll = async () => {
  try {
    await uploadsService.deleteAllReports()
    await loadReports()
    showDeleteAllConfirm.value = false
  } catch (error) {
    console.error('Error deleting all reports:', error)
  }
}

const handleClearStatistics = async () => {
  try {
    const result = await analyticsService.clearStatistics()
    console.log('Statistics cleared:', result)
    await loadReports()
    showClearStatsConfirm.value = false
    // Можно добавить уведомление пользователю о результате
  } catch (error) {
    console.error('Error clearing statistics:', error)
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
  } catch (err: any) {
    replaceError.value = err.response?.data?.message || 'Произошла ошибка при замене файла'
  } finally {
    replacing.value = false
  }
}

// Initialize
onMounted(() => {
  loadReports()
})
</script>