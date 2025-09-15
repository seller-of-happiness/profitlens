<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900">Загрузить отчет</h1>
      <p class="mt-2 text-lg text-gray-600">
        Загрузите файл с данными продаж для анализа прибыльности
      </p>
    </div>

    <!-- Upload form -->
    <div class="card">
      <div class="card-body">
        <form @submit.prevent="handleUpload" class="space-y-6">
          <!-- Marketplace selection -->
          <div>
            <label class="form-label">Маркетплейс</label>
            <div class="mt-2 space-y-2">
              <div class="flex items-center">
                <input
                  id="wildberries"
                  v-model="selectedMarketplace"
                  name="marketplace"
                  type="radio"
                  value="WILDBERRIES"
                  class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <label for="wildberries" class="ml-3 block text-sm font-medium text-gray-700">
                  Wildberries
                </label>
              </div>
              <div class="flex items-center">
                <input
                  id="ozon"
                  v-model="selectedMarketplace"
                  name="marketplace"
                  type="radio"
                  value="OZON"
                  class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <label for="ozon" class="ml-3 block text-sm font-medium text-gray-700">
                  Ozon
                </label>
              </div>
            </div>
          </div>

          <!-- File upload -->
          <div>
            <label class="form-label">Файл с данными продаж</label>
            <FileUpload
              ref="fileUploadRef"
              accept=".xlsx,.xls,.csv"
              :max-size="52428800"
              @files-selected="onFilesSelected"
              @error="onUploadError"
            />
          </div>

          <!-- Expected columns info -->
          <div v-if="selectedMarketplace" class="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div class="flex">
              <InformationCircleIcon class="h-5 w-5 text-blue-400" />
              <div class="ml-3">
                <h3 class="text-sm font-medium text-blue-800">
                  Ожидаемые колонки для {{ marketplaceName }}
                </h3>
                <div class="mt-2 text-sm text-blue-700">
                  <ul class="list-disc list-inside space-y-1">
                    <li v-for="column in expectedColumns" :key="column">{{ column }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Submit button -->
          <div class="flex justify-end">
            <BaseButton
              type="submit"
              variant="primary"
              :loading="uploading"
              :disabled="!canUpload"
              size="lg"
            >
              <CloudArrowUpIcon class="h-5 w-5 mr-2" />
              Загрузить и обработать
            </BaseButton>
          </div>
        </form>
      </div>
    </div>

    <!-- Upload progress -->
    <div v-if="uploading" class="card">
      <div class="card-body">
        <div class="flex items-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <div class="ml-4">
            <h3 class="text-lg font-medium text-gray-900">Обработка файла...</h3>
            <p class="text-sm text-gray-600">Это может занять до 30 секунд</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Success message -->
    <div v-if="uploadSuccess" class="rounded-md bg-green-50 p-4">
      <div class="flex">
        <CheckCircleIcon class="h-5 w-5 text-green-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-green-800">Файл успешно загружен!</h3>
          <div class="mt-2 text-sm text-green-700">
            <p>Файл отправлен на обработку. Результаты будут доступны в разделе "Отчеты".</p>
          </div>
          <div class="mt-4">
            <div class="flex space-x-3">
              <BaseButton
                variant="outline"
                size="sm"
                @click="$router.push('/reports')"
              >
                Перейти к отчетам
              </BaseButton>
              <BaseButton
                variant="outline"
                size="sm"
                @click="uploadAnother"
              >
                Загрузить еще файл
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="rounded-md bg-red-50 p-4">
      <div class="flex">
        <ExclamationTriangleIcon class="h-5 w-5 text-red-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Ошибка загрузки</h3>
          <div class="mt-2 text-sm text-red-700">
            <p>{{ error }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Help section -->
    <div class="card">
      <div class="card-header">
        <h3 class="text-lg font-medium text-gray-900">Как подготовить файл для загрузки?</h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="text-base font-medium text-gray-900 mb-3">Wildberries</h4>
            <ol class="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Войдите в личный кабинет продавца WB</li>
              <li>Перейдите в раздел "Аналитика" → "Продажи"</li>
              <li>Выберите нужный период</li>
              <li>Скачайте отчет в формате Excel или CSV</li>
              <li>Загрузите файл на нашу платформу</li>
            </ol>
          </div>
          
          <div>
            <h4 class="text-base font-medium text-gray-900 mb-3">Ozon</h4>
            <ol class="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Войдите в личный кабинет продавца Ozon</li>
              <li>Перейдите в раздел "Аналитика" → "Продажи и заказы"</li>
              <li>Выберите нужный период</li>
              <li>Экспортируйте данные в Excel или CSV</li>
              <li>Загрузите файл на нашу платформу</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { uploadsService } from '@/services/uploads'
import { Marketplace } from '@shared/types'
import FileUpload from '@/components/ui/FileUpload.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  CloudArrowUpIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'

const selectedMarketplace = ref<Marketplace | ''>('')
const selectedFiles = ref<File[]>([])
const uploading = ref(false)
const uploadSuccess = ref(false)
const error = ref('')

const fileUploadRef = ref()

const marketplaceName = computed(() => {
  return selectedMarketplace.value === 'WILDBERRIES' ? 'Wildberries' : 'Ozon'
})

const expectedColumns = computed(() => {
  if (selectedMarketplace.value === 'WILDBERRIES') {
    return [
      'Дата продажи',
      'Артикул WB',
      'Наименование',
      'Цена продажи',
      'Количество',
      'Комиссия WB',
    ]
  } else if (selectedMarketplace.value === 'OZON') {
    return [
      'Дата',
      'Артикул',
      'Название товара',
      'Цена за единицу',
      'Количество',
      'Комиссия за продажу',
    ]
  }
  return []
})

const canUpload = computed(() => {
  return selectedMarketplace.value && selectedFiles.value.length > 0 && !uploading.value
})

const onFilesSelected = (files: File[]) => {
  selectedFiles.value = files
  error.value = ''
}

const onUploadError = (message: string) => {
  error.value = message
}

const handleUpload = async () => {
  if (!canUpload.value) return

  try {
    uploading.value = true
    error.value = ''
    uploadSuccess.value = false

    await uploadsService.uploadFile(
      selectedFiles.value[0],
      selectedMarketplace.value as Marketplace
    )

    uploadSuccess.value = true
    selectedFiles.value = []
    selectedMarketplace.value = ''
    
    // Clear the file upload component
    if (fileUploadRef.value) {
      fileUploadRef.value.clearFiles()
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Произошла ошибка при загрузке файла'
  } finally {
    uploading.value = false
  }
}

const uploadAnother = () => {
  uploadSuccess.value = false
  error.value = ''
  selectedFiles.value = []
  selectedMarketplace.value = ''
  
  if (fileUploadRef.value) {
    fileUploadRef.value.clearFiles()
  }
}
</script>