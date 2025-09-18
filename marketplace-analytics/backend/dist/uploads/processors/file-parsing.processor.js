"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FileParsingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileParsingProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const analytics_service_1 = require("../../analytics/analytics.service");
const constants_1 = require("../../common/constants");
const XLSX = require("xlsx");
const Papa = require("papaparse");
const fs = require("fs");
const path = require("path");
let FileParsingProcessor = FileParsingProcessor_1 = class FileParsingProcessor {
    constructor(prisma, analyticsService) {
        this.prisma = prisma;
        this.analyticsService = analyticsService;
        this.logger = new common_1.Logger(FileParsingProcessor_1.name);
    }
    async handleFileParsingJob(job) {
        const { reportId, filePath, marketplace } = job.data;
        this.logger.log(`Starting to parse file for report ${reportId}`);
        try {
            const parsedData = await this.parseFile(filePath, marketplace);
            const salesData = await Promise.all(parsedData.map(async (row) => {
                const analytics = await this.analyticsService.calculateRowAnalytics(row, marketplace);
                return {
                    reportId,
                    ...analytics,
                };
            }));
            await this.prisma.$transaction(async (tx) => {
                await tx.salesData.createMany({
                    data: salesData,
                });
                const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
                const totalProfit = salesData.reduce((sum, item) => sum + item.netProfit, 0);
                const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
                await tx.report.update({
                    where: { id: reportId },
                    data: {
                        processed: true,
                        totalRevenue,
                        totalProfit,
                        profitMargin,
                    },
                });
            });
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            this.logger.log(`Successfully parsed file for report ${reportId}`);
        }
        catch (error) {
            this.logger.error(`Error parsing file for report ${reportId}:`, error);
            await this.prisma.report.update({
                where: { id: reportId },
                data: { processed: false },
            });
            throw error;
        }
    }
    async parseFile(filePath, marketplace) {
        const fileExtension = path.extname(filePath).toLowerCase();
        if (fileExtension === '.csv') {
            return this.parseCsvFile(filePath, marketplace);
        }
        else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
            return this.parseExcelFile(filePath, marketplace);
        }
        else {
            throw new Error(`Unsupported file format: ${fileExtension}`);
        }
    }
    async parseCsvFile(filePath, marketplace) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
        });
        return this.mapRowsToSalesData(parsed.data, marketplace);
    }
    async parseExcelFile(filePath, marketplace) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        return this.mapRowsToSalesData(data, marketplace);
    }
    mapRowsToSalesData(rows, marketplace) {
        return rows.map((row) => {
            if (marketplace === constants_1.Marketplace.WILDBERRIES) {
                return this.mapWildberriesRow(row);
            }
            else if (marketplace === constants_1.Marketplace.OZON) {
                return this.mapOzonRow(row);
            }
            else {
                throw new Error(`Unsupported marketplace: ${marketplace}`);
            }
        }).filter(Boolean);
    }
    mapWildberriesRow(row) {
        const dateField = row['Дата продажи'] || row['Date'] || row['date'];
        const skuField = row['Артикул WB'] || row['SKU'] || row['sku'];
        const nameField = row['Наименование'] || row['Product Name'] || row['name'];
        const priceField = row['Цена продажи'] || row['Price'] || row['price'];
        const quantityField = row['Количество'] || row['Quantity'] || row['quantity'];
        const commissionField = row['Комиссия WB'] || row['Commission'] || row['commission'];
        if (!dateField || !skuField || !nameField || !priceField || !quantityField) {
            return null;
        }
        return {
            sku: String(skuField),
            productName: String(nameField),
            saleDate: new Date(dateField),
            quantity: parseInt(quantityField) || 1,
            price: parseFloat(priceField) || 0,
            commission: parseFloat(commissionField) || 0,
        };
    }
    mapOzonRow(row) {
        const dateField = row['Дата'] || row['Date'] || row['date'];
        const skuField = row['Артикул'] || row['SKU'] || row['sku'];
        const nameField = row['Название товара'] || row['Product Name'] || row['name'];
        const priceField = row['Цена за единицу'] || row['Price'] || row['price'];
        const quantityField = row['Количество'] || row['Quantity'] || row['quantity'];
        const commissionField = row['Комиссия за продажу'] || row['Commission'] || row['commission'];
        if (!dateField || !skuField || !nameField || !priceField || !quantityField) {
            return null;
        }
        return {
            sku: String(skuField),
            productName: String(nameField),
            saleDate: new Date(dateField),
            quantity: parseInt(quantityField) || 1,
            price: parseFloat(priceField) || 0,
            commission: parseFloat(commissionField) || 0,
        };
    }
};
exports.FileParsingProcessor = FileParsingProcessor;
__decorate([
    (0, bull_1.Process)('parse-file'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FileParsingProcessor.prototype, "handleFileParsingJob", null);
exports.FileParsingProcessor = FileParsingProcessor = FileParsingProcessor_1 = __decorate([
    (0, bull_1.Processor)('file-parsing'),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_service_1.AnalyticsService])
], FileParsingProcessor);
//# sourceMappingURL=file-parsing.processor.js.map