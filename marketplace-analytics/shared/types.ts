// Общие типы для frontend и backend

export interface User {
  id: string;
  email: string;
  name?: string;
  plan: SubscriptionPlan;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  userId: string;
  fileName: string;
  marketplace: Marketplace;
  uploadDate: Date;
  processed: boolean;
  totalRevenue?: number;
  totalProfit?: number;
  profitMargin?: number;
  _count?: {
    salesData: number;
  };
}

export interface SalesData {
  id: string;
  reportId: string;
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
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  START = 'START',
  BUSINESS = 'BUSINESS',
  PRO = 'PRO'
}

export enum Marketplace {
  WILDBERRIES = 'WILDBERRIES',
  OZON = 'OZON'
}

// API Response типы
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface UploadFileRequest {
  marketplace: Marketplace;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  topProducts: TopProduct[];
  dailySales: DailySales[];
  expenseBreakdown: ExpenseBreakdown;
}

export interface TopProduct {
  sku: string;
  productName: string;
  revenue: number;
  profit: number;
  profitMargin: number;
  quantity: number;
}

export interface DailySales {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface ExpenseBreakdown {
  commission: number;
  logistics: number;
  storage: number;
  returns: number;
}

// Комиссии маркетплейсов
export interface MarketplaceCommissions {
  saleCommission: number;
  acquiring?: number;
  fulfillment?: number;
  logistics: number;
  storage: number;
  returns: number;
}

export const MARKETPLACE_COMMISSIONS: Record<Marketplace, MarketplaceCommissions> = {
  [Marketplace.WILDBERRIES]: {
    saleCommission: 0.05, // 5%
    acquiring: 0.023, // 2.3%
    logistics: 0.04, // 4%
    storage: 0.025, // 2.5%
    returns: 0.015 // 1.5%
  },
  [Marketplace.OZON]: {
    saleCommission: 0.08, // 8%
    fulfillment: 0.025, // 2.5%
    logistics: 0.035, // 3.5%
    storage: 0.02, // 2%
    returns: 0.02 // 2%
  }
};

// Парсинг файлов
export interface ParsedSalesRow {
  sku: string;
  productName: string;
  saleDate: Date;
  quantity: number;
  price: number;
  commission?: number;
}

export interface WildberriesRow {
  'Дата продажи': string;
  'Артикул WB': string;
  'Наименование': string;
  'Цена продажи': number;
  'Количество': number;
  'Комиссия WB': number;
}

export interface OzonRow {
  'Дата': string;
  'Артикул': string;
  'Название товара': string;
  'Цена за единицу': number;
  'Количество': number;
  'Комиссия за продажу': number;
}

// Планы подписки
export interface SubscriptionPlanInfo {
  name: string;
  price: number;
  currency: string;
  features: string[];
  uploadsLimit?: number;
  marketplaces: Marketplace[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanInfo> = {
  [SubscriptionPlan.FREE]: {
    name: 'FREE',
    price: 0,
    currency: '₽',
    features: ['3 загрузки в месяц', 'Базовая аналитика', 'Только Wildberries'],
    uploadsLimit: 3,
    marketplaces: [Marketplace.WILDBERRIES]
  },
  [SubscriptionPlan.START]: {
    name: 'START',
    price: 990,
    currency: '₽',
    features: ['Безлимит загрузок', 'WB + Ozon', 'Экспорт в Excel'],
    marketplaces: [Marketplace.WILDBERRIES, Marketplace.OZON]
  },
  [SubscriptionPlan.BUSINESS]: {
    name: 'BUSINESS',
    price: 1990,
    currency: '₽',
    features: ['Автоматические инсайты', 'API доступ', 'Экспорт в PDF'],
    marketplaces: [Marketplace.WILDBERRIES, Marketplace.OZON]
  },
  [SubscriptionPlan.PRO]: {
    name: 'PRO',
    price: 3990,
    currency: '₽',
    features: ['Прогнозирование', 'Приоритетная поддержка', 'Интеграция с 1С'],
    marketplaces: [Marketplace.WILDBERRIES, Marketplace.OZON]
  }
};