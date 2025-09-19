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

  async clearStatistics(): Promise<{ message: string; deletedReports: number; deletedSalesData: number }> {
    return apiService.delete('/analytics/clear')
  }
}

export const analyticsService = new AnalyticsService()