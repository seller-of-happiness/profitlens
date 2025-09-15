import { apiService } from './api'
import type { LoginRequest, RegisterRequest, AuthResponse } from '@shared/types'

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/login', credentials)
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/register', userData)
  }

  async getProfile() {
    return apiService.get('/auth/profile')
  }

  setAuthToken(token: string) {
    apiService.setAuthToken(token)
  }

  clearAuthToken() {
    apiService.clearAuthToken()
  }
}

export const authService = new AuthService()