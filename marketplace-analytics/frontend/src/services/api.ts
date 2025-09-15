import axios, { type AxiosInstance, type AxiosResponse } from 'axios'

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor для добавления токена
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor для обработки ошибок
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      (error) => {
        if (error.response?.status === 401) {
          // Токен истек или недействителен
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          window.location.href = '/auth/login'
        }
        return Promise.reject(error)
      }
    )
  }

  public setAuthToken(token: string) {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  public clearAuthToken() {
    delete this.api.defaults.headers.common['Authorization']
  }

  // Generic методы для HTTP запросов
  public async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.api.get(url, { params })
    return response.data
  }

  public async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post(url, data)
    return response.data
  }

  public async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put(url, data)
    return response.data
  }

  public async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.patch(url, data)
    return response.data
  }

  public async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete(url)
    return response.data
  }

  // Метод для загрузки файлов
  public async uploadFile<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  // Получение экземпляра axios для специальных случаев
  public getInstance(): AxiosInstance {
    return this.api
  }
}

export const apiService = new ApiService()