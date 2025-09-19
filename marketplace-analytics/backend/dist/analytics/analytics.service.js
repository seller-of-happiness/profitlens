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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const constants_1 = require("../common/constants");
const path = require("path");
const fs = require("fs");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.MARKETPLACE_COMMISSIONS = {
            [constants_1.Marketplace.WILDBERRIES]: {
                saleCommission: 0.05,
                acquiring: 0.023,
                logistics: 0.04,
                storage: 0.025,
                returns: 0.015,
            },
            [constants_1.Marketplace.OZON]: {
                saleCommission: 0.08,
                fulfillment: 0.025,
                logistics: 0.035,
                storage: 0.02,
                returns: 0.02,
            },
        };
    }
    async calculateRowAnalytics(row, marketplace) {
        if (!row.saleDate || !(row.saleDate instanceof Date) || isNaN(row.saleDate.getTime())) {
            throw new Error(`Invalid sale date provided: ${row.saleDate}`);
        }
        if (!row.sku || typeof row.sku !== 'string' || row.sku.trim().length === 0) {
            throw new Error(`Invalid SKU provided: ${row.sku}`);
        }
        if (!row.productName || typeof row.productName !== 'string' || row.productName.trim().length === 0) {
            throw new Error(`Invalid product name provided: ${row.productName}`);
        }
        if (!row.quantity || isNaN(row.quantity) || row.quantity <= 0) {
            throw new Error(`Invalid quantity provided: ${row.quantity}`);
        }
        if (isNaN(row.price) || row.price < 0) {
            throw new Error(`Invalid price provided: ${row.price}`);
        }
        const commissions = this.MARKETPLACE_COMMISSIONS[marketplace];
        const revenue = row.price * row.quantity;
        const saleCommission = revenue * commissions.saleCommission;
        const logistics = revenue * commissions.logistics;
        const storage = revenue * commissions.storage;
        let totalCommission = saleCommission + logistics + storage;
        if (marketplace === constants_1.Marketplace.WILDBERRIES && commissions.acquiring) {
            totalCommission += revenue * commissions.acquiring;
        }
        if (marketplace === constants_1.Marketplace.OZON && commissions.fulfillment) {
            totalCommission += revenue * commissions.fulfillment;
        }
        const netProfit = revenue - totalCommission;
        const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
        return {
            sku: row.sku.trim(),
            productName: row.productName.trim(),
            saleDate: row.saleDate,
            quantity: row.quantity,
            price: row.price,
            revenue,
            netProfit,
            profitMargin,
            commission: saleCommission,
            logistics,
            storage,
        };
    }
    async getReportAnalytics(reportId, userId) {
        const report = await this.prisma.report.findFirst({
            where: { id: reportId, userId },
            include: {
                salesData: true,
            },
        });
        if (!report) {
            throw new Error('Report not found');
        }
        const salesData = report.salesData;
        const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
        const totalProfit = salesData.reduce((sum, item) => sum + item.netProfit, 0);
        const totalOrders = salesData.length;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const productMap = new Map();
        salesData.forEach((item) => {
            const key = item.sku;
            if (productMap.has(key)) {
                const existing = productMap.get(key);
                existing.revenue += item.revenue;
                existing.profit += item.netProfit;
                existing.quantity += item.quantity;
            }
            else {
                productMap.set(key, {
                    sku: item.sku,
                    productName: item.productName,
                    revenue: item.revenue,
                    profit: item.netProfit,
                    quantity: item.quantity,
                });
            }
        });
        const topProducts = Array.from(productMap.values())
            .map((product) => ({
            ...product,
            profitMargin: product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0,
        }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10);
        const dailySalesMap = new Map();
        salesData.forEach((item) => {
            const dateKey = item.saleDate.toISOString().split('T')[0];
            if (dailySalesMap.has(dateKey)) {
                const existing = dailySalesMap.get(dateKey);
                existing.revenue += item.revenue;
                existing.profit += item.netProfit;
                existing.orders += 1;
            }
            else {
                dailySalesMap.set(dateKey, {
                    date: dateKey,
                    revenue: item.revenue,
                    profit: item.netProfit,
                    orders: 1,
                });
            }
        });
        const dailySales = Array.from(dailySalesMap.values())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const totalCommission = salesData.reduce((sum, item) => sum + item.commission, 0);
        const totalLogistics = salesData.reduce((sum, item) => sum + item.logistics, 0);
        const totalStorage = salesData.reduce((sum, item) => sum + item.storage, 0);
        const expenseBreakdown = {
            commission: totalCommission,
            logistics: totalLogistics,
            storage: totalStorage,
            returns: 0,
        };
        return {
            totalRevenue,
            totalProfit,
            profitMargin,
            totalOrders,
            topProducts,
            dailySales,
            expenseBreakdown,
        };
    }
    async getUserAnalytics(userId, period) {
        const whereClause = { userId };
        if (period) {
            const now = new Date();
            let startDate;
            switch (period) {
                case '7d':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90d':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
            whereClause.uploadDate = {
                gte: startDate,
            };
        }
        const reports = await this.prisma.report.findMany({
            where: whereClause,
            include: {
                salesData: true,
            },
        });
        const allSalesData = reports.flatMap((report) => report.salesData);
        if (allSalesData.length === 0) {
            return {
                totalRevenue: 0,
                totalProfit: 0,
                profitMargin: 0,
                totalOrders: 0,
                topProducts: [],
                dailySales: [],
                expenseBreakdown: {
                    commission: 0,
                    logistics: 0,
                    storage: 0,
                    returns: 0,
                },
            };
        }
        const totalRevenue = allSalesData.reduce((sum, item) => sum + item.revenue, 0);
        const totalProfit = allSalesData.reduce((sum, item) => sum + item.netProfit, 0);
        const totalOrders = allSalesData.length;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const productMap = new Map();
        allSalesData.forEach((item) => {
            const key = item.sku;
            if (productMap.has(key)) {
                const existing = productMap.get(key);
                existing.revenue += item.revenue;
                existing.profit += item.netProfit;
                existing.quantity += item.quantity;
            }
            else {
                productMap.set(key, {
                    sku: item.sku,
                    productName: item.productName,
                    revenue: item.revenue,
                    profit: item.netProfit,
                    quantity: item.quantity,
                });
            }
        });
        const topProducts = Array.from(productMap.values())
            .map((product) => ({
            ...product,
            profitMargin: product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0,
        }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10);
        const dailySalesMap = new Map();
        allSalesData.forEach((item) => {
            const dateKey = item.saleDate.toISOString().split('T')[0];
            if (dailySalesMap.has(dateKey)) {
                const existing = dailySalesMap.get(dateKey);
                existing.revenue += item.revenue;
                existing.profit += item.netProfit;
                existing.orders += 1;
            }
            else {
                dailySalesMap.set(dateKey, {
                    date: dateKey,
                    revenue: item.revenue,
                    profit: item.netProfit,
                    orders: 1,
                });
            }
        });
        const dailySales = Array.from(dailySalesMap.values())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const totalCommission = allSalesData.reduce((sum, item) => sum + item.commission, 0);
        const totalLogistics = allSalesData.reduce((sum, item) => sum + item.logistics, 0);
        const totalStorage = allSalesData.reduce((sum, item) => sum + item.storage, 0);
        const expenseBreakdown = {
            commission: totalCommission,
            logistics: totalLogistics,
            storage: totalStorage,
            returns: 0,
        };
        return {
            totalRevenue,
            totalProfit,
            profitMargin,
            totalOrders,
            topProducts,
            dailySales,
            expenseBreakdown,
        };
    }
    async clearUserStatistics(userId) {
        const reports = await this.prisma.report.findMany({
            where: { userId },
        });
        if (reports.length === 0) {
            return {
                message: 'Нет данных для удаления',
                deletedReports: 0,
                deletedSalesData: 0
            };
        }
        const uploadDir = process.env.UPLOAD_DEST || './uploads';
        reports.forEach((report) => {
            const filePath = path.join(uploadDir, `${report.id}_${report.fileName}`);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                }
                catch (error) {
                    console.error(`Ошибка при удалении файла ${filePath}:`, error);
                }
            }
        });
        const salesDataCount = await this.prisma.salesData.count({
            where: {
                report: {
                    userId,
                },
            },
        });
        await this.prisma.report.deleteMany({
            where: { userId },
        });
        return {
            message: `Вся статистика очищена. Удалено отчетов: ${reports.length}, записей данных: ${salesDataCount}`,
            deletedReports: reports.length,
            deletedSalesData: salesDataCount,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map