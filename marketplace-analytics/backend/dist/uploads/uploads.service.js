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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const analytics_service_1 = require("../analytics/analytics.service");
const constants_1 = require("../common/constants");
const path = require("path");
const fs = require("fs");
const Papa = require("papaparse");
const XLSX = require("xlsx");
let UploadsService = class UploadsService {
    constructor(prisma, analyticsService) {
        this.prisma = prisma;
        this.analyticsService = analyticsService;
    }
    async uploadFile(file, userId, marketplace) {
        this.validateFile(file);
        const report = await this.prisma.report.create({
            data: {
                userId,
                fileName: file.originalname,
                marketplace,
                processed: false,
            },
        });
        const uploadDir = process.env.UPLOAD_DEST || './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, `${report.id}_${file.originalname}`);
        fs.writeFileSync(filePath, file.buffer);
        try {
            await this.processFileSync(report.id, filePath, marketplace);
            console.log(`✅ Файл ${file.originalname} успешно обработан`);
        }
        catch (error) {
            console.error(`❌ Ошибка обработки файла ${file.originalname}:`, error.message);
            await this.prisma.report.update({
                where: { id: report.id },
                data: { processed: false },
            });
            throw error;
        }
        return {
            reportId: report.id,
            message: 'Файл загружен и отправлен на обработку',
        };
    }
    async getReports(userId) {
        return this.prisma.report.findMany({
            where: { userId },
            orderBy: { uploadDate: 'desc' },
            include: {
                _count: {
                    select: { salesData: true },
                },
            },
        });
    }
    async getReport(reportId, userId) {
        const report = await this.prisma.report.findFirst({
            where: { id: reportId, userId },
            include: {
                salesData: {
                    orderBy: { saleDate: 'desc' },
                },
            },
        });
        if (!report) {
            throw new common_1.BadRequestException('Отчет не найден');
        }
        return report;
    }
    async deleteReport(reportId, userId) {
        const report = await this.prisma.report.findFirst({
            where: { id: reportId, userId },
        });
        if (!report) {
            throw new common_1.BadRequestException('Отчет не найден');
        }
        const uploadDir = process.env.UPLOAD_DEST || './uploads';
        const filePath = path.join(uploadDir, `${report.id}_${report.fileName}`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        await this.prisma.report.delete({
            where: { id: reportId },
        });
        return { message: 'Отчет удален' };
    }
    async deleteAllReports(userId) {
        const reports = await this.prisma.report.findMany({
            where: { userId },
        });
        if (reports.length === 0) {
            return { message: 'Нет отчетов для удаления', deletedCount: 0 };
        }
        const uploadDir = process.env.UPLOAD_DEST || './uploads';
        reports.forEach((report) => {
            const filePath = path.join(uploadDir, `${report.id}_${report.fileName}`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
        await this.prisma.report.deleteMany({
            where: { userId },
        });
        return {
            message: `Удалено отчетов: ${reports.length}`,
            deletedCount: reports.length
        };
    }
    async replaceReport(reportId, newFile, userId, marketplace) {
        const existingReport = await this.prisma.report.findFirst({
            where: { id: reportId, userId },
        });
        if (!existingReport) {
            throw new common_1.BadRequestException('Отчет не найден');
        }
        this.validateFile(newFile);
        const uploadDir = process.env.UPLOAD_DEST || './uploads';
        const oldFilePath = path.join(uploadDir, `${reportId}_${existingReport.fileName}`);
        if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
        }
        const newFilePath = path.join(uploadDir, `${reportId}_${newFile.originalname}`);
        fs.writeFileSync(newFilePath, newFile.buffer);
        await this.prisma.salesData.deleteMany({
            where: { reportId },
        });
        await this.prisma.report.update({
            where: { id: reportId },
            data: {
                fileName: newFile.originalname,
                marketplace,
                processed: false,
                totalRevenue: null,
                totalProfit: null,
                profitMargin: null,
            },
        });
        await this.prisma.report.update({
            where: { id: reportId },
            data: { processed: true },
        });
        return {
            reportId,
            message: 'Отчет успешно заменен',
        };
    }
    validateFile(file) {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'text/plain',
            'application/csv',
        ];
        const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 52428800;
        const allowedExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const isValidType = allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension);
        if (!isValidType) {
            throw new common_1.BadRequestException('Неподдерживаемый формат файла. Разрешены только Excel (.xlsx, .xls) и CSV (.csv) файлы');
        }
        if (file.size > maxSize) {
            throw new common_1.BadRequestException(`Размер файла превышает допустимый лимит (${Math.round(maxSize / 1024 / 1024)}MB)`);
        }
    }
    async processFileSync(reportId, filePath, marketplace) {
        console.log(`🔄 Начинаем обработку файла: ${filePath}`);
        const fileExtension = path.extname(filePath).toLowerCase();
        let parsedData;
        try {
            if (fileExtension === '.csv') {
                parsedData = await this.parseCsvFile(filePath);
            }
            else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
                parsedData = await this.parseExcelFile(filePath);
            }
            else {
                throw new Error(`Неподдерживаемый формат файла: ${fileExtension}`);
            }
            console.log(`📊 Парсинг завершен, найдено строк: ${parsedData.length}`);
            const salesData = [];
            let processedCount = 0;
            let errorCount = 0;
            for (const row of parsedData) {
                try {
                    const mappedRow = this.mapRowToSalesData(row, marketplace);
                    if (mappedRow) {
                        const analytics = await this.analyticsService.calculateRowAnalytics(mappedRow, marketplace);
                        salesData.push({
                            reportId,
                            ...analytics,
                        });
                        processedCount++;
                    }
                }
                catch (error) {
                    console.warn(`⚠️ Ошибка обработки строки: ${error.message}`);
                    errorCount++;
                }
            }
            console.log(`✅ Обработано строк: ${processedCount}, ошибок: ${errorCount}`);
            if (salesData.length === 0) {
                throw new Error('Не удалось обработать ни одной строки данных');
            }
            await this.prisma.$transaction(async (tx) => {
                await tx.salesData.deleteMany({
                    where: { reportId }
                });
                await tx.salesData.createMany({
                    data: salesData
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
                console.log(`💰 Выручка: ${totalRevenue}₽, Прибыль: ${totalProfit}₽, Маржа: ${profitMargin.toFixed(2)}%`);
            });
        }
        catch (error) {
            console.error(`❌ Ошибка обработки файла:`, error.message);
            throw error;
        }
    }
    async parseCsvFile(filePath) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            quoteChar: '"',
            escapeChar: '"',
            transformHeader: (header) => header.trim(),
        });
        if (parsed.errors && parsed.errors.length > 0) {
            console.warn(`⚠️ Ошибки парсинга CSV:`, parsed.errors.slice(0, 3));
        }
        return parsed.data;
    }
    async parseExcelFile(filePath) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    }
    mapRowToSalesData(row, marketplace) {
        if (marketplace === constants_1.Marketplace.OZON) {
            const dateStr = row['Дата'];
            const sku = row['Артикул'];
            const productName = row['Название товара'];
            const price = parseFloat(row['Цена за единицу']) || 0;
            const quantity = parseInt(row['Количество']) || 0;
            const commission = parseFloat(row['Комиссия за продажу']) || 0;
            if (!dateStr || !sku || !productName || price <= 0 || quantity <= 0) {
                return null;
            }
            const dateParts = dateStr.split('.');
            if (dateParts.length === 3) {
                const day = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]);
                const year = parseInt(dateParts[2]);
                const saleDate = new Date(year, month - 1, day);
                if (!isNaN(saleDate.getTime())) {
                    return {
                        sku: sku.toString().trim(),
                        productName: productName.toString().trim(),
                        saleDate,
                        quantity,
                        price,
                        commission,
                    };
                }
            }
        }
        else if (marketplace === constants_1.Marketplace.WILDBERRIES) {
            const dateStr = row['Дата продажи'];
            const sku = row['Артикул WB'];
            const productName = row['Наименование'];
            const price = parseFloat(row['Цена продажи']) || 0;
            const quantity = parseInt(row['Количество']) || 0;
            const commission = parseFloat(row['Комиссия WB']) || 0;
            if (!dateStr || !sku || !productName || price <= 0 || quantity <= 0) {
                return null;
            }
            let saleDate;
            if (dateStr.includes('.')) {
                const dateParts = dateStr.split('.');
                if (dateParts.length === 3) {
                    const day = parseInt(dateParts[0]);
                    const month = parseInt(dateParts[1]);
                    const year = parseInt(dateParts[2]);
                    saleDate = new Date(year, month - 1, day);
                }
            }
            else {
                saleDate = new Date(dateStr);
            }
            if (!isNaN(saleDate.getTime())) {
                return {
                    sku: sku.toString().trim(),
                    productName: productName.toString().trim(),
                    saleDate,
                    quantity,
                    price,
                    commission,
                };
            }
        }
        return null;
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_service_1.AnalyticsService])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map