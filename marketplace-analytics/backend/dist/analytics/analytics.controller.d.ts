import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getDashboardAnalytics(req: any, period?: string): Promise<{
        totalRevenue: number;
        totalProfit: number;
        profitMargin: number;
        totalOrders: number;
        topProducts: any[];
        dailySales: any[];
        expenseBreakdown: {
            commission: number;
            logistics: number;
            storage: number;
            returns: number;
        };
    }>;
    getReportAnalytics(reportId: string, req: any): Promise<{
        totalRevenue: number;
        totalProfit: number;
        profitMargin: number;
        totalOrders: number;
        topProducts: any[];
        dailySales: any[];
        expenseBreakdown: {
            commission: number;
            logistics: number;
            storage: number;
            returns: number;
        };
    }>;
}
