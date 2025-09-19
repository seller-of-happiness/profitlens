import { Controller, Get, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Получить аналитику для дашборда пользователя' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d'], description: 'Период для анализа' })
  @ApiResponse({ status: 200, description: 'Аналитика дашборда' })
  async getDashboardAnalytics(
    @Request() req,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getUserAnalytics(req.user.id, period);
  }

  @Get('report/:id')
  @ApiOperation({ summary: 'Получить аналитику для конкретного отчета' })
  @ApiResponse({ status: 200, description: 'Аналитика отчета' })
  @ApiResponse({ status: 404, description: 'Отчет не найден' })
  async getReportAnalytics(
    @Param('id') reportId: string,
    @Request() req,
  ) {
    return this.analyticsService.getReportAnalytics(reportId, req.user.id);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Очистить всю статистику пользователя' })
  @ApiResponse({ status: 200, description: 'Статистика очищена' })
  async clearUserStatistics(@Request() req) {
    return this.analyticsService.clearUserStatistics(req.user.id);
  }
}