<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-primary-600 mb-2">Marketplace Analytics</h1>
        <p class="text-gray-600">Аналитика продаж на маркетплейсах</p>
      </div>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <router-view />
      </div>
      
      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300" />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-gray-50 text-gray-500">
              {{ $route.name === 'Login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?' }}
            </span>
          </div>
        </div>

        <div class="mt-6 text-center">
          <router-link
            :to="$route.name === 'Login' ? '/auth/register' : '/auth/login'"
            class="font-medium text-primary-600 hover:text-primary-500"
          >
            {{ $route.name === 'Login' ? 'Зарегистрироваться' : 'Войти' }}
          </router-link>
        </div>
      </div>
    </div>

    <!-- Features section -->
    <div class="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-900 mb-8">Возможности платформы</h2>
        <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div class="text-center">
            <div class="mx-auto h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <ChartBarIcon class="h-6 w-6 text-primary-600" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Детальная аналитика</h3>
            <p class="text-gray-600">Полный анализ продаж с расчетом прибыли и комиссий</p>
          </div>
          
          <div class="text-center">
            <div class="mx-auto h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <CloudArrowUpIcon class="h-6 w-6 text-primary-600" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Простая загрузка</h3>
            <p class="text-gray-600">Загружайте Excel и CSV файлы одним кликом</p>
          </div>
          
          <div class="text-center">
            <div class="mx-auto h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <BoltIcon class="h-6 w-6 text-primary-600" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Быстрая обработка</h3>
            <p class="text-gray-600">Анализ данных за 30 секунд</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChartBarIcon, CloudArrowUpIcon, BoltIcon } from '@heroicons/vue/24/outline'
</script>