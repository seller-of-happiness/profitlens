<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <div class="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0" :class="{ '-translate-x-full': !sidebarOpen }">
      <div class="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <h1 class="text-xl font-bold text-primary-600">Marketplace Analytics</h1>
      </div>
      
      <nav class="mt-8">
        <div class="px-4 space-y-2">
          <router-link
            v-for="item in navigation"
            :key="item.name"
            :to="item.to"
            class="group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors duration-150"
            :class="$route.name === item.name ? 'bg-primary-100 text-primary-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          >
            <component :is="item.icon" class="mr-4 h-6 w-6" />
            {{ item.label }}
          </router-link>
        </div>
      </nav>
      
      <!-- User menu -->
      <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <span class="text-white font-medium">{{ userInitials }}</span>
            </div>
          </div>
          <div class="ml-3 flex-1">
            <p class="text-sm font-medium text-gray-900">{{ user?.name || user?.email }}</p>
            <p class="text-xs text-gray-500">{{ user?.plan }}</p>
          </div>
          <button @click="logout" class="ml-2 p-2 text-gray-400 hover:text-gray-600">
            <LogoutIcon class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu button -->
    <div class="lg:hidden fixed top-4 left-4 z-50">
      <button @click="toggleSidebar" class="bg-white p-2 rounded-md shadow-md">
        <MenuIcon class="h-6 w-6" />
      </button>
    </div>

    <!-- Main content -->
    <div class="lg:pl-64 flex flex-col min-h-screen">
      <!-- Top bar -->
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center lg:hidden">
              <button @click="toggleSidebar" class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                <MenuIcon class="h-6 w-6" />
              </button>
            </div>
            
            <div class="flex-1 flex justify-center lg:justify-start">
              <h2 class="text-2xl font-bold text-gray-900">{{ pageTitle }}</h2>
            </div>
            
            <div class="flex items-center space-x-4">
              <!-- Notifications -->
              <button class="p-2 text-gray-400 hover:text-gray-500">
                <BellIcon class="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 py-6">
        <div class="px-4 sm:px-6 lg:px-8">
          <router-view />
        </div>
      </main>
    </div>

    <!-- Mobile sidebar overlay -->
    <div v-if="sidebarOpen" @click="toggleSidebar" class="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-25"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  HomeIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserIcon,
  Bars3Icon as MenuIcon,
  BellIcon,
  ArrowLeftOnRectangleIcon as LogoutIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const sidebarOpen = ref(false)

const user = computed(() => authStore.user)

const userInitials = computed(() => {
  if (user.value?.name) {
    return user.value.name
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return user.value?.email?.[0]?.toUpperCase() || 'U'
})

const navigation = [
  { name: 'Dashboard', label: 'Дашборд', to: '/', icon: HomeIcon },
  { name: 'Upload', label: 'Загрузить файл', to: '/upload', icon: CloudArrowUpIcon },
  { name: 'Analytics', label: 'Аналитика', to: '/analytics', icon: ChartBarIcon },
  { name: 'Reports', label: 'Отчеты', to: '/reports', icon: DocumentTextIcon },
  { name: 'Profile', label: 'Профиль', to: '/profile', icon: UserIcon },
]

const pageTitle = computed(() => {
  const currentNav = navigation.find(item => item.name === route.name)
  return currentNav?.label || 'Marketplace Analytics'
})

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const logout = () => {
  authStore.logout()
  router.push('/auth/login')
}
</script>