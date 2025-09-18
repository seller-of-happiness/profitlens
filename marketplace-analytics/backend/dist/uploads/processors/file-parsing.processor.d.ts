import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { Marketplace } from '../../common/constants';
interface FileParsingJob {
    reportId: string;
    filePath: string;
    marketplace: Marketplace;
}
export declare class FileParsingProcessor {
    private prisma;
    private analyticsService;
    private readonly logger;
    constructor(prisma: PrismaService, analyticsService: AnalyticsService);
    handleFileParsingJob(job: Job<FileParsingJob>): Promise<void>;
    private parseFile;
    private parseCsvFile;
    private parseExcelFile;
    private mapRowsToSalesData;
    private mapWildberriesRow;
    private mapOzonRow;
}
export {};
