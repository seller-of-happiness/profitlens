<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-5">
      <h1 class="text-2xl font-bold text-gray-900">Профиль</h1>
      <p class="mt-1 text-sm text-gray-600">
        Управление аккаунтом и настройками
      </p>
    </div>

    <!-- Profile Information -->
    <div class="card">
      <div class="card-header">
        <h3 class="text-lg font-medium text-gray-900">Информация профиля</h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label class="form-label">Email</label>
            <input
              v-model="userProfile.email"
              type="email"
              class="form-input"
              disabled
            />
          </div>
          <div>
            <label class="form-label">Имя</label>
            <input
              v-model="userProfile.name"
              type="text"
              class="form-input"
              placeholder="Введите ваше имя"
            />
          </div>
          <div>
            <label class="form-label">Тарифный план</label>
            <div class="mt-1">
              <span 
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getPlanColor(userProfile.plan)"
              >
                {{ formatPlan(userProfile.plan) }}
              </span>
            </div>
          </div>
          <div>
            <label class="form-label">Дата регистрации</label>
            <div class="mt-1 text-sm text-gray-900">
              {{ formatDate(userProfile.createdAt) }}
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end">
          <BaseButton
            variant="primary"
            @click="updateProfile"
            :loading="updating"
          >
            Сохранить изменения
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Statistics and Data Management -->
    <div class="card">
      <div class="card-header">
        <h3 class="text-lg font-medium text-gray-900">Управление данными</h3>
        <p class="text-sm text-gray-600">
          Настройки связанные с вашими отчетами и статистикой
        </p>
      </div>
      <div class="card-body">
        <div class="space-y-6">
          <!-- Statistics Overview -->
          <div v-if="statistics" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-600">{{ statistics.totalReports }}</div>
              <div class="text-sm text-blue-700">Всего отчетов</div>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">{{ statistics.totalSalesData }}</div>
              <div class="text-sm text-green-700">Записей продаж</div>
            </div>
            <div class="text-center p-4 bg-purple-50 rounded-lg">
              <div class="text-2xl font-bold text-purple-600">{{ formatCurrency(statistics.totalRevenue) }}</div>
              <div class="text-sm text-purple-700">Общая выручка</div>
            </div>
            <div class="text-center p-4 bg-yellow-50 rounded-lg">
              <div class="text-2xl font-bold text-yellow-600">{{ formatCurrency(statistics.totalProfit) }}</div>
              <div class="text-sm text-yellow-700">Общая прибыль</div>
            </div>
          </div>

          <!-- Actions -->
          <div class="border-t border-gray-200 pt-6">
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 class="text-sm font-medium text-gray-900">Экспорт данных</h4>
                  <p class="text-sm text-gray-500">Скачать все ваши данные в формате JSON</p>
                </div>
                <BaseButton
                  variant="outline"
                  :icon="ArrowDownTrayIcon"
                  @click="exportData"
                  :loading="exporting"
                  disabled
                >
                  Экспорт (скоро)
                </BaseButton>
              </div>

              <div class="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div>
                  <h4 class="text-sm font-medium text-yellow-800">Сбросить всю статистику</h4>
                  <p class="text-sm text-yellow-700">
                    Удалить ВСЕ отчеты и данные продаж. Это действие необратимо!
                  </p>
                </div>
                <BaseButton
                  variant="danger"
                  :icon="ExclamationTriangleIcon"
                  @click="confirmResetStatistics"
                  :disabled="!statistics || statistics.totalReports === 0"
                >
                  Сбросить статистику
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Account Settings -->
    <div class="card">
      <div class="card-header">
        <h3 class="text-lg font-medium text-gray-900">Настройки аккаунта</h3>
      </div>
      <div class="card-body">
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 class="text-sm font-medium text-gray-900">Изменить пароль</h4>
              <p class="text-sm text-gray-500">Обновить пароль для входа в систему</p>
            </div>
            <BaseButton
              variant="outline"
              :icon="KeyIcon"
              disabled
            >
              Изменить (скоро)
            </BaseButton>
          </div>

          <div class="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
            <div>
              <h4 class="text-sm font-medium text-red-800">Удалить аккаунт</h4>
              <p class="text-sm text-red-700">
                Полностью удалить ваш аккаунт и все связанные данные
              </p>
            </div>
            <BaseButton
              variant="danger"
              :icon="TrashIcon"
              disabled
            >
              Удалить (скоро)
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Reset Statistics Confirmation Modal -->
  <ConfirmationModal
    v-model="showResetStatisticsConfirm"
    title="Сбросить всю статистику"
    message="Вы уверены, что хотите ПОЛНОСТЬЮ СБРОСИТЬ всю статистику? Это действие удалит ВСЕ отчеты и данные продаж безвозвратно! Восстановить данные будет невозможно."
    confirm-text="Да, сбросить всю статистику"
    confirm-variant="danger"
    @confirm="handleResetStatistics"
  />

  <!-- Success Modal -->
  <BaseModal v-model="showSuccessModal" title="Статистика сброшена" size="sm">
    <div class="text-center py-4">
      <CheckCircleIcon class="mx-auto h-12 w-12 text-green-500 mb-4" />
      <p class="text-sm text-gray-600">
        Вся статистика была успешно сброшена. Теперь вы можете загрузить новые отчеты.
      </p>
    </div>
    <template #footer>
      <div class="flex justify-center">
        <BaseButton variant="primary" @click="redirectToDashboard">
          Перейти к дашборду
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { analyticsService } from '@/services/analytics'
import { uploadsService } from '@/services/uploads'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import {
  UserIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  KeyIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const { showSuccess, showError } = useToast()

// Reactive data
const userProfile = ref({
  email: '',
  name: '',
  plan: 'FREE',
  createdAt: new Date(),
})

const statistics = ref<{
  totalReports: number
  totalSalesData: number
  totalRevenue: number
  totalProfit: number
} | null>(null)

const updating = ref(false)
const exporting = ref(false)
const showResetStatisticsConfirm = ref(false)
const showSuccessModal = ref(false)

// Methods
const loadProfile = async () => {
  try {
    // Get user from auth store (in real app, this would come from API)
    const user = authStore.user
    if (user) {
      userProfile.value = {
        email: user.email || 'test@example.com',
        name: user.name || '',
        plan: user.plan || 'FREE',
        createdAt: user.createdAt || new Date(),
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error)
  }
}

const loadStatistics = async () => {
  try {
    const reports = await uploadsService.getReports()
    
    const totalReports = reports.length
    const totalSalesData = reports.reduce((sum, report) => sum + (report._count?.salesData || 0), 0)
    const totalRevenue = reports.reduce((sum, report) => sum + (report.totalRevenue || 0), 0)
    const totalProfit = reports.reduce((sum, report) => sum + (report.totalProfit || 0), 0)
    
    statistics.value = {
      totalReports,
      totalSalesData,
      totalRevenue,
      totalProfit,
    }
  } catch (error) {
    console.error('Error loading statistics:', error)
    statistics.value = {
      totalReports: 0,
      totalSalesData: 0,
      totalRevenue: 0,
      totalProfit: 0,
    }
  }
}

const updateProfile = async () => {
  try {
    updating.value = true
    // In real app, this would call API to update profile
    console.log('Profile update:', userProfile.value)
    showSuccess('Профиль обновлен', 'Изменения в профиле сохранены')
  } catch (error: any) {
    console.error('Error updating profile:', error)
    showError('Ошибка обновления', error.response?.data?.message || 'Не удалось обновить профиль')
  } finally {
    updating.value = false
  }
}

const exportData = async () => {
  try {
    exporting.value = true
    // Export functionality will be implemented later
    console.log('Export data')
  } catch (error) {
    console.error('Error exporting data:', error)
  } finally {
    exporting.value = false
  }
}

const confirmResetStatistics = () => {
  showResetStatisticsConfirm.value = true
}

const handleResetStatistics = async () => {
  try {
    const result = await analyticsService.clearStatistics()
    console.log('Statistics reset:', result)
    
    showResetStatisticsConfirm.value = false
    showSuccessModal.value = true
    
    showSuccess(
      'Статистика сброшена', 
      `Удалено отчетов: ${result.deletedReports}, записей продаж: ${result.deletedSalesData}`
    )
    
    // Reload statistics
    await loadStatistics()
  } catch (error: any) {
    console.error('Error resetting statistics:', error)
    showError('Ошибка сброса', error.response?.data?.message || 'Не удалось сбросить статистику')
    showResetStatisticsConfirm.value = false
  }
}

const redirectToDashboard = () => {
  showSuccessModal.value = false
  router.push('/dashboard')
}

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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

const formatPlan = (plan: string) => {
  const plans: Record<string, string> = {
    FREE: 'Бесплатный',
    START: 'Стартовый',
    BUSINESS: 'Бизнес',
    PRO: 'Профессиональный',
  }
  return plans[plan] || plan
}

const getPlanColor = (plan: string) => {
  const colors: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-800',
    START: 'bg-green-100 text-green-800',
    BUSINESS: 'bg-blue-100 text-blue-800',
    PRO: 'bg-purple-100 text-purple-800',
  }
  return colors[plan] || 'bg-gray-100 text-gray-800'
}

// Initialize
onMounted(() => {
  loadProfile()
  loadStatistics()
})
</script>