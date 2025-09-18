import { apiService } from './api'
import type { Report, Marketplace } from '@shared/types'

class UploadsService {
  async uploadFile(file: File, marketplace: Marketplace) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('marketplace', marketplace)
    
    return apiService.uploadFile('/uploads', formData)
  }

  async getReports(): Promise<Report[]> {
    return apiService.get<Report[]>('/uploads')
  }

  async getReport(id: string): Promise<Report> {
    return apiService.get<Report>(`/uploads/${id}`)
  }

  async deleteReport(id: string) {
    return apiService.delete(`/uploads/${id}`)
  }

  async deleteAllReports() {
    return apiService.delete('/uploads')
  }

  async replaceReport(id: string, file: File, marketplace: Marketplace) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('marketplace', marketplace)
    
    return apiService.uploadFile(`/uploads/${id}/replace`, formData)
  }
}

export const uploadsService = new UploadsService()