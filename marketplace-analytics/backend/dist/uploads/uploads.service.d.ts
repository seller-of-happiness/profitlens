import { PrismaService } from '../prisma/prisma.service';
import { Marketplace } from '../common/constants';
export declare class UploadsService {
    private prisma;
    constructor(prisma: PrismaService);
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
            saleDate: Date;
            reportId: string;
            sku: string;
            productName: string;
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
    private validateFile;
}
