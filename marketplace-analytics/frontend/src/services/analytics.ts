import { apiService } from './api'
import type { AnalyticsData } from '@shared/types'

class AnalyticsService {
  async getDashboardAnalytics(period?: string): Promise<AnalyticsData> {
    const params = period ? { period } : undefined
    return apiService.get<AnalyticsData>('/analytics/dashboard', params)
  }

  async getReportAnalytics(reportId: string): Promise<AnalyticsData> {
    return apiService.get<AnalyticsData>(`/analytics/report/${reportId}`)
  }

  async getUserReports(): Promise<any[]> {
    return apiService.get('/analytics/reports')
  }

  async updateReport(reportId: string, fileName: string): Promise<{ message: string; report: any }> {
    return apiService.put(`/analytics/report/${reportId}`, { fileName })
  }

  async deleteReport(reportId: string): Promise<{ message: string; deletedSalesData: number }> {
    return apiService.delete(`/analytics/report/${reportId}`)
  }

  async deleteAllReports(): Promise<{ message: string; deletedReports: number; deletedSalesData: number }> {
    return apiService.delete('/analytics/reports/all')
  }

  async clearStatistics(): Promise<{ message: string; deletedReports: number; deletedSalesData: number }> {
    return apiService.delete('/analytics/clear')
  }
}

export const analyticsService = new AnalyticsService()