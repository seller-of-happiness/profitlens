import { PrismaService } from '../prisma/prisma.service';
import { Marketplace } from '../common/constants';
interface ParsedSalesRow {
    sku: string;
    productName: string;
    saleDate: Date;
    quantity: number;
    price: number;
    commission?: number;
}
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly MARKETPLACE_COMMISSIONS;
    calculateRowAnalytics(row: ParsedSalesRow, marketplace: Marketplace): Promise<{
        sku: string;
        productName: string;
        saleDate: Date;
        quantity: number;
        price: number;
        revenue: number;
        netProfit: number;
        profitMargin: number;
        commission: number;
        logistics: number;
        storage: number;
    }>;
    getReportAnalytics(reportId: string, userId: string): Promise<{
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
    getUserAnalytics(userId: string, period?: string): Promise<{
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
export {};
