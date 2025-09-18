import { UploadsService } from './uploads.service';
import { Marketplace } from '../common/constants';
export declare class UploadsController {
    private readonly uploadsService;
    constructor(uploadsService: UploadsService);
    uploadFile(file: Express.Multer.File, marketplace: Marketplace, req: any): Promise<{
        reportId: string;
        message: string;
    }>;
    getReports(req: any): Promise<({
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
    getReport(id: string, req: any): Promise<{
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
    deleteReport(id: string, req: any): Promise<{
        message: string;
    }>;
}
