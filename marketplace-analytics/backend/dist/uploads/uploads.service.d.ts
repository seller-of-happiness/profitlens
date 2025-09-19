import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Marketplace } from '../common/constants';
export declare class UploadsService {
    private prisma;
    private analyticsService;
    constructor(prisma: PrismaService, analyticsService: AnalyticsService);
    uploadFile(file: Express.Multer.File, userId: string, marketplace: Marketplace): Promise<{
        reportId: string;
        message: string;
    }>;
    getReports(userId: string): Promise<({
        _count: {
            salesData: number;
        };
    } & {
        id: string;
        userId: string;
        fileName: string;
        marketplace: string;
        uploadDate: Date;
        processed: boolean;
        totalRevenue: number | null;
        totalProfit: number | null;
        profitMargin: number | null;
    })[]>;
    getReport(reportId: string, userId: string): Promise<{
        salesData: {
            id: string;
            profitMargin: number;
            reportId: string;
            sku: string;
            productName: string;
            saleDate: Date;
            quantity: number;
            price: number;
            revenue: number;
            netProfit: number;
            commission: number;
            logistics: number;
            storage: number;
        }[];
    } & {
        id: string;
        userId: string;
        fileName: string;
        marketplace: string;
        uploadDate: Date;
        processed: boolean;
        totalRevenue: number | null;
        totalProfit: number | null;
        profitMargin: number | null;
    }>;
    deleteReport(reportId: string, userId: string): Promise<{
        message: string;
    }>;
    deleteAllReports(userId: string): Promise<{
        message: string;
        deletedCount: number;
    }>;
    replaceReport(reportId: string, newFile: Express.Multer.File, userId: string, marketplace: Marketplace): Promise<{
        reportId: string;
        message: string;
    }>;
    private validateFile;
    private processFileSync;
    private parseCsvFile;
    private parseExcelFile;
    private mapRowToSalesData;
}
