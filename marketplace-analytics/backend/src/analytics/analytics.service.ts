import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Marketplace } from '@prisma/client';

interface ParsedSalesRow {
  sku: string;
  productName: string;
  saleDate: Date;
  quantity: number;
  price: number;
  commission?: number;
}

interface MarketplaceCommissions {
  saleCommission: number;
  acquiring?: number;
  fulfillment?: number;
  logistics: number;
  storage: number;
  returns: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Комиссии маркетплейсов
  private readonly MARKETPLACE_COMMISSIONS: Record<Marketplace, MarketplaceCommissions> = {
    [Marketplace.WILDBERRIES]: {
      saleCommission: 0.05, // 5%
      acquiring: 0.023, // 2.3%
      logistics: 0.04, // 4%
      storage: 0.025, // 2.5%
      returns: 0.015, // 1.5%
    },
    [Marketplace.OZON]: {
      saleCommission: 0.08, // 8%
      fulfillment: 0.025, // 2.5%
      logistics: 0.035, // 3.5%
      storage: 0.02, // 2%
      returns: 0.02, // 2%
    },
  };

  async calculateRowAnalytics(row: ParsedSalesRow, marketplace: Marketplace) {
    const commissions = this.MARKETPLACE_COMMISSIONS[marketplace];
    const revenue = row.price * row.quantity;

    // Расчет комиссий
    const saleCommission = revenue * commissions.saleCommission;
    const logistics = revenue * commissions.logistics;
    const storage = revenue * commissions.storage;
    
    let totalCommission = saleCommission + logistics + storage;

    // Дополнительные комиссии для разных маркетплейсов
    if (marketplace === Marketplace.WILDBERRIES && commissions.acquiring) {
      totalCommission += revenue * commissions.acquiring;
    }
    
    if (marketplace === Marketplace.OZON && commissions.fulfillment) {
      totalCommission += revenue * commissions.fulfillment;
    }

    // Чистая прибыль (без учета себестоимости, так как её нет в файлах)
    const netProfit = revenue - totalCommission;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      sku: row.sku,
      productName: row.productName,
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

  async getReportAnalytics(reportId: string, userId: string) {
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

    // Основные метрики
    const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
    const totalProfit = salesData.reduce((sum, item) => sum + item.netProfit, 0);
    const totalOrders = salesData.length;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Топ товаров по прибыли
    const productMap = new Map();
    salesData.forEach((item) => {
      const key = item.sku;
      if (productMap.has(key)) {
        const existing = productMap.get(key);
        existing.revenue += item.revenue;
        existing.profit += item.netProfit;
        existing.quantity += item.quantity;
      } else {
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

    // Продажи по дням
    const dailySalesMap = new Map();
    salesData.forEach((item) => {
      const dateKey = item.saleDate.toISOString().split('T')[0];
      if (dailySalesMap.has(dateKey)) {
        const existing = dailySalesMap.get(dateKey);
        existing.revenue += item.revenue;
        existing.profit += item.netProfit;
        existing.orders += 1;
      } else {
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

    // Структура расходов
    const totalCommission = salesData.reduce((sum, item) => sum + item.commission, 0);
    const totalLogistics = salesData.reduce((sum, item) => sum + item.logistics, 0);
    const totalStorage = salesData.reduce((sum, item) => sum + item.storage, 0);

    const expenseBreakdown = {
      commission: totalCommission,
      logistics: totalLogistics,
      storage: totalStorage,
      returns: 0, // Пока не учитываем возвраты
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

  async getUserAnalytics(userId: string, period?: string) {
    const whereClause: any = { userId };

    // Фильтр по периоду
    if (period) {
      const now = new Date();
      let startDate: Date;

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

    // Агрегируем данные по всем отчетам
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

    // Повторяем логику расчета аналитики для всех данных
    const totalRevenue = allSalesData.reduce((sum, item) => sum + item.revenue, 0);
    const totalProfit = allSalesData.reduce((sum, item) => sum + item.netProfit, 0);
    const totalOrders = allSalesData.length;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Топ товаров
    const productMap = new Map();
    allSalesData.forEach((item) => {
      const key = item.sku;
      if (productMap.has(key)) {
        const existing = productMap.get(key);
        existing.revenue += item.revenue;
        existing.profit += item.netProfit;
        existing.quantity += item.quantity;
      } else {
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

    // Продажи по дням
    const dailySalesMap = new Map();
    allSalesData.forEach((item) => {
      const dateKey = item.saleDate.toISOString().split('T')[0];
      if (dailySalesMap.has(dateKey)) {
        const existing = dailySalesMap.get(dateKey);
        existing.revenue += item.revenue;
        existing.profit += item.netProfit;
        existing.orders += 1;
      } else {
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

    // Структура расходов
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
}