import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth'
import type { User, LoginRequest, RegisterRequest } from '@shared/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value && !!token.value)

  const initAuth = () => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')
    
    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
      authService.setAuthToken(storedToken)
    }
  }

  const login = async (credentials: LoginRequest) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await authService.login(credentials)
      
      user.value = response.user
      token.value = response.accessToken
      
      localStorage.setItem('auth_token', response.accessToken)
      localStorage.setItem('auth_user', JSON.stringify(response.user))
      
      authService.setAuthToken(response.accessToken)
      
      return response
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Ошибка входа'
      throw err
    } finally {
      loading.value = false
    }
  }

  const register = async (userData: RegisterRequest) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await authService.register(userData)
      
      user.value = response.user
      token.value = response.accessToken
      
      localStorage.setItem('auth_token', response.accessToken)
      localStorage.setItem('auth_user', JSON.stringify(response.user))
      
      authService.setAuthToken(response.accessToken)
      
      return response
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Ошибка регистрации'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    
    authService.clearAuthToken()
  }

  const updateUser = (userData: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...userData }
      localStorage.setItem('auth_user', JSON.stringify(user.value))
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    initAuth,
    login,
    register,
    logout,
    updateUser,
  }
})