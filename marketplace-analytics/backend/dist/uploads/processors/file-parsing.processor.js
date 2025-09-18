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
            const salesData = await Promise.allSettled(parsedData.map(async (row) => {
                try {
                    const analytics = await this.analyticsService.calculateRowAnalytics(row, marketplace);
                    return {
                        reportId,
                        ...analytics,
                    };
                }
                catch (error) {
                    this.logger.warn(`Failed to process row with SKU ${row?.sku}: ${error.message}`);
                    return null;
                }
            }));
            const validSalesData = salesData
                .filter((result) => result.status === 'fulfilled' && result.value !== null)
                .map(result => result.value);
            const finalValidatedData = validSalesData.filter(item => {
                if (!item.saleDate || isNaN(item.saleDate.getTime())) {
                    this.logger.warn(`Filtering out item with invalid date - SKU: ${item.sku}, Date: ${item.saleDate}`);
                    return false;
                }
                return true;
            });
            await this.prisma.$transaction(async (tx) => {
                if (finalValidatedData.length === 0) {
                    throw new Error('No valid sales data found after processing and validation. Please check your file format and date fields.');
                }
                this.logger.log(`Processing ${finalValidatedData.length} valid sales records out of ${parsedData.length} total parsed records`);
                await tx.salesData.createMany({
                    data: finalValidatedData,
                });
                const totalRevenue = finalValidatedData.reduce((sum, item) => sum + item.revenue, 0);
                const totalProfit = finalValidatedData.reduce((sum, item) => sum + item.netProfit, 0);
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
        let cleanedContent = fileContent
            .replace(/\0/g, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
        const lines = cleanedContent.split('\n');
        const cleanedLines = lines.map((line, index) => {
            if (index === 0)
                return line;
            if (line.includes('Книга') || line.includes('Видеокарта') || line.includes('Фен') ||
                line.includes('Кофеварка') || line.includes('Пылесос') || line.includes('Электрочайник')) {
                const dateMatch = line.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
                if (dateMatch) {
                    const dateStr = dateMatch[1];
                    const dateIndex = line.indexOf(dateStr);
                    const afterDate = line.substring(dateIndex);
                    const parts = afterDate.split(',');
                    if (parts.length >= 7) {
                        return afterDate;
                    }
                }
                return '';
            }
            return line;
        }).filter(line => line.trim() !== '');
        cleanedContent = cleanedLines.join('\n');
        const parsed = Papa.parse(cleanedContent, {
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            quoteChar: '"',
            escapeChar: '"',
            transformHeader: (header) => header.trim(),
        });
        if (parsed.errors && parsed.errors.length > 0) {
            this.logger.warn(`CSV parsing errors found:`, parsed.errors.slice(0, 5));
        }
        const validRows = parsed.data.filter((row) => {
            const dateField = row['Дата'] || row['Date'] || row['date'];
            const skuField = row['Артикул'] || row['SKU'] || row['sku'];
            if (dateField && typeof dateField === 'string') {
                const dateStr = dateField.toString();
                if (dateStr.includes('Книга') || dateStr.includes('Видеокарта') ||
                    dateStr.includes('Фен') || dateStr.includes('Кофеварка') ||
                    dateStr.includes('Пылесос') || dateStr.includes('Электрочайник') ||
                    dateStr.length > 50) {
                    return false;
                }
            }
            if (skuField && typeof skuField === 'string') {
                const skuStr = skuField.toString();
                if (skuStr.length > 50 || skuStr.includes('Видеокарта') ||
                    skuStr.includes('Фен') || skuStr.includes('Книга')) {
                    return false;
                }
            }
            return true;
        });
        this.logger.log(`Filtered ${parsed.data.length - validRows.length} corrupted rows, processing ${validRows.length} valid rows`);
        return this.mapRowsToSalesData(validRows, marketplace);
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
        const skuString = String(skuField).trim();
        const nameString = String(nameField).trim();
        if (skuString.length < 3 || skuString.length > 20 ||
            nameString.length < 3 || nameString.length > 200 ||
            nameString.includes('\n') || nameString.includes(',')) {
            this.logger.warn(`Skipping corrupted row: SKU ${skuString}, Name: ${nameString.substring(0, 50)}...`);
            return null;
        }
        const quantity = parseInt(quantityField);
        const price = parseFloat(priceField);
        if (isNaN(quantity) || quantity <= 0 || quantity > 10000) {
            this.logger.warn(`Invalid quantity for SKU ${skuField}: ${quantityField}`);
            return null;
        }
        if (isNaN(price) || price < 0 || price > 1000000) {
            this.logger.warn(`Invalid price for SKU ${skuField}: ${priceField}`);
            return null;
        }
        const parsedDate = this.parseAndValidateDate(dateField);
        if (!parsedDate) {
            this.logger.warn(`Invalid date field for SKU ${skuField}: "${dateField}" (type: ${typeof dateField})`);
            return null;
        }
        if (isNaN(parsedDate.getTime())) {
            this.logger.warn(`Parsed date is NaN for SKU ${skuField}: "${dateField}" -> ${parsedDate}`);
            return null;
        }
        return {
            sku: skuString,
            productName: nameString,
            saleDate: parsedDate,
            quantity,
            price,
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
        const skuString = String(skuField).trim();
        const nameString = String(nameField).trim();
        if (skuString.length < 3 || skuString.length > 20 ||
            nameString.length < 3 || nameString.length > 200 ||
            nameString.includes('\n') || nameString.includes(',')) {
            this.logger.warn(`Skipping corrupted row: SKU ${skuString}, Name: ${nameString.substring(0, 50)}...`);
            return null;
        }
        const quantity = parseInt(quantityField);
        const price = parseFloat(priceField);
        if (isNaN(quantity) || quantity <= 0 || quantity > 10000) {
            this.logger.warn(`Invalid quantity for SKU ${skuField}: ${quantityField}`);
            return null;
        }
        if (isNaN(price) || price < 0 || price > 1000000) {
            this.logger.warn(`Invalid price for SKU ${skuField}: ${priceField}`);
            return null;
        }
        const parsedDate = this.parseAndValidateDate(dateField);
        if (!parsedDate) {
            this.logger.warn(`Invalid date field for SKU ${skuField}: "${dateField}" (type: ${typeof dateField})`);
            return null;
        }
        if (isNaN(parsedDate.getTime())) {
            this.logger.warn(`Parsed date is NaN for SKU ${skuField}: "${dateField}" -> ${parsedDate}`);
            return null;
        }
        return {
            sku: skuString,
            productName: nameString,
            saleDate: parsedDate,
            quantity,
            price,
            commission: parseFloat(commissionField) || 0,
        };
    }
    parseAndValidateDate(dateField) {
        if (!dateField) {
            return null;
        }
        let dateString = String(dateField).trim();
        if (dateString.length > 20 || /[а-яё]/i.test(dateString)) {
            this.logger.debug(`Processing suspicious date field: "${dateString}"`);
        }
        if (!/\d/.test(dateString) || dateString.length < 8 || dateString.length > 50) {
            this.logger.warn(`Date field too short or too long: "${dateString}"`);
            return null;
        }
        if (/[а-яё]/i.test(dateString) ||
            dateString.includes('"') ||
            dateString.includes('\n') ||
            /\d{10,}/.test(dateString) ||
            /[,;:]{2,}/.test(dateString) ||
            dateString.includes('Видеокарта') ||
            dateString.includes('Фен') ||
            dateString.includes('Книга') ||
            dateString.includes('Кофеварка') ||
            dateString.includes('Пылесос') ||
            dateString.includes('Электрочайник') ||
            dateString.includes('Куртка') ||
            dateString.includes('Косметический') ||
            dateString.includes('Игровая') ||
            dateString.includes('Колонка') ||
            dateString.includes('Увлажнитель') ||
            dateString.includes('Рюкзак') ||
            dateString.includes('Наушники') ||
            dateString.includes('Часы') ||
            dateString.includes('Термос') ||
            dateString.includes('Смартфон') ||
            dateString.includes('Планшет') ||
            dateString.includes('Набор') ||
            dateString.includes('Кроссовки') ||
            dateString.includes('Матрас') ||
            dateString.includes('Apple') ||
            dateString.includes('Nike') ||
            dateString.includes('Samsung') ||
            dateString.includes('Dyson') ||
            dateString.includes('JBL') ||
            dateString.includes('Logitech') ||
            dateString.includes('Stanley') ||
            dateString.includes('Tefal') ||
            dateString.includes('Philips') ||
            dateString.includes('iPad') ||
            dateString.includes('iPhone') ||
            dateString.includes('AirPods') ||
            dateString.includes('Galaxy') ||
            dateString.includes('Watch') ||
            dateString.includes('RTX') ||
            dateString.includes('HD7447')) {
            return null;
        }
        const dateMatch = dateString.match(/^(\d{1,2}\.\d{1,2}\.\d{4})/);
        if (dateMatch) {
            dateString = dateMatch[1];
        }
        else {
            const altDateMatch = dateString.match(/^(\d{4}-\d{1,2}-\d{1,2})/);
            if (altDateMatch) {
                dateString = altDateMatch[1];
            }
        }
        let parsedDate;
        if (dateString.includes('.')) {
            const parts = dateString.split('.');
            if (parts.length === 3) {
                const day = parseInt(parts[0].trim());
                const month = parseInt(parts[1].trim());
                const year = parseInt(parts[2].trim());
                if (isNaN(day) || isNaN(month) || isNaN(year) ||
                    day < 1 || day > 31 ||
                    month < 1 || month > 12 ||
                    year < 1900 || year > 2100) {
                    this.logger.warn(`Invalid date components: day=${day}, month=${month}, year=${year} from "${dateString}"`);
                    return null;
                }
                parsedDate = new Date(Date.UTC(year, month - 1, day));
                const createdDay = parsedDate.getUTCDate();
                const createdMonth = parsedDate.getUTCMonth() + 1;
                const createdYear = parsedDate.getUTCFullYear();
                if (createdDay !== day || createdMonth !== month || createdYear !== year) {
                    this.logger.warn(`Date rollover detected for "${dateString}": expected ${day}/${month}/${year}, got ${createdDay}/${createdMonth}/${createdYear}`);
                    return null;
                }
                this.logger.debug(`Successfully parsed date "${dateString}" -> ${parsedDate.toISOString()}`);
            }
            else {
                this.logger.warn(`Malformed dot-separated date: "${dateString}" (${parts.length} parts)`);
                return null;
            }
        }
        else if (dateString.includes('-')) {
            parsedDate = new Date(dateString);
        }
        else if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const month = parseInt(parts[0]);
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                if (isNaN(day) || isNaN(month) || isNaN(year) ||
                    day < 1 || day > 31 ||
                    month < 1 || month > 12 ||
                    year < 1900 || year > 2100) {
                    return null;
                }
                parsedDate = new Date(Date.UTC(year, month - 1, day));
                const createdDay = parsedDate.getUTCDate();
                const createdMonth = parsedDate.getUTCMonth() + 1;
                const createdYear = parsedDate.getUTCFullYear();
                if (createdDay !== day || createdMonth !== month || createdYear !== year) {
                    return null;
                }
            }
            else {
                return null;
            }
        }
        else if (/^\d{1,2}\s+\d{1,2}\s+\d{4}$/.test(dateString)) {
            const parts = dateString.split(/\s+/);
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
                    return null;
                }
                parsedDate = new Date(Date.UTC(year, month - 1, day));
                const createdDay = parsedDate.getUTCDate();
                const createdMonth = parsedDate.getUTCMonth() + 1;
                const createdYear = parsedDate.getUTCFullYear();
                if (createdDay !== day || createdMonth !== month || createdYear !== year) {
                    return null;
                }
            }
            else {
                return null;
            }
        }
        else {
            if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
                parsedDate = new Date(dateString);
            }
            else {
                const dotParts = dateString.split('.');
                if (dotParts.length === 3) {
                    const day = parseInt(dotParts[0]);
                    const month = parseInt(dotParts[1]);
                    const year = parseInt(dotParts[2]);
                    if (isNaN(day) || isNaN(month) || isNaN(year) ||
                        day < 1 || day > 31 ||
                        month < 1 || month > 12 ||
                        year < 1900 || year > 2100) {
                        return null;
                    }
                    parsedDate = new Date(Date.UTC(year, month - 1, day));
                    const createdDay = parsedDate.getUTCDate();
                    const createdMonth = parsedDate.getUTCMonth() + 1;
                    const createdYear = parsedDate.getUTCFullYear();
                    if (createdDay !== day || createdMonth !== month || createdYear !== year) {
                        return null;
                    }
                }
                else {
                    return null;
                }
            }
        }
        if (isNaN(parsedDate.getTime())) {
            this.logger.warn(`Final date validation failed for "${dateString}": parsedDate.getTime() is NaN`);
            return null;
        }
        const currentYear = new Date().getFullYear();
        const dateYear = parsedDate.getUTCFullYear();
        if (dateYear < 2020 || dateYear > currentYear + 1) {
            this.logger.warn(`Date year out of range for "${dateString}": ${dateYear} (expected 2020-${currentYear + 1})`);
            return null;
        }
        return parsedDate;
    }
    parseDate(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return null;
        }
        const cleanDateString = dateString.trim();
        const dateParts = cleanDateString.split('.');
        if (dateParts.length === 3) {
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            if (isNaN(day) || isNaN(month) || isNaN(year) ||
                day < 1 || day > 31 ||
                month < 1 || month > 12 ||
                year < 2020 || year > 2030) {
                return null;
            }
            const date = new Date(Date.UTC(year, month - 1, day));
            const createdDay = date.getUTCDate();
            const createdMonth = date.getUTCMonth() + 1;
            const createdYear = date.getUTCFullYear();
            if (createdDay !== day || createdMonth !== month || createdYear !== year) {
                return null;
            }
            return date;
        }
        const parsed = new Date(cleanDateString);
        if (isNaN(parsed.getTime())) {
            return null;
        }
        return parsed;
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