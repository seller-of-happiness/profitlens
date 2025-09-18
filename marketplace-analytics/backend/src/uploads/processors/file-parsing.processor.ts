import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { Marketplace } from '../../common/constants';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';

interface FileParsingJob {
  reportId: string;
  filePath: string;
  marketplace: Marketplace;
}

@Processor('file-parsing')
@Injectable()
export class FileParsingProcessor {
  private readonly logger = new Logger(FileParsingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
  ) {}

  @Process('parse-file')
  async handleFileParsingJob(job: Job<FileParsingJob>) {
    const { reportId, filePath, marketplace } = job.data;
    
    this.logger.log(`Starting to parse file for report ${reportId}`);

    try {
      // Парсинг файла
      const parsedData = await this.parseFile(filePath, marketplace);
      
      // Расчет аналитики для каждой строки с обработкой ошибок
      const salesData = await Promise.allSettled(
        parsedData.map(async (row) => {
          try {
            const analytics = await this.analyticsService.calculateRowAnalytics(
              row,
              marketplace,
            );
            return {
              reportId,
              ...analytics,
            };
          } catch (error) {
            this.logger.warn(`Failed to process row with SKU ${row?.sku}: ${error.message}`);
            return null;
          }
        }),
      );

      // Extract successful results and filter out failed ones
      const validSalesData = salesData
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      // Сохранение данных в БД
      await this.prisma.$transaction(async (tx) => {
        if (validSalesData.length === 0) {
          throw new Error('No valid sales data found after processing. Please check your file format.');
        }

        this.logger.log(`Processing ${validSalesData.length} valid sales records out of ${parsedData.length} total parsed records`);

        // Сохранение данных продаж
        await tx.salesData.createMany({
          data: validSalesData,
        });

        // Расчет общих метрик отчета
        const totalRevenue = validSalesData.reduce((sum, item) => sum + item.revenue, 0);
        const totalProfit = validSalesData.reduce((sum, item) => sum + item.netProfit, 0);
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        // Обновление отчета
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

      // Удаление временного файла
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      this.logger.log(`Successfully parsed file for report ${reportId}`);
    } catch (error) {
      this.logger.error(`Error parsing file for report ${reportId}:`, error);
      
      // Обновление статуса отчета как ошибочного
      await this.prisma.report.update({
        where: { id: reportId },
        data: { processed: false },
      });

      throw error;
    }
  }

  private async parseFile(filePath: string, marketplace: Marketplace) {
    const fileExtension = path.extname(filePath).toLowerCase();
    
    if (fileExtension === '.csv') {
      return this.parseCsvFile(filePath, marketplace);
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      return this.parseExcelFile(filePath, marketplace);
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }
  }

  private async parseCsvFile(filePath: string, marketplace: Marketplace) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Clean up the file content to handle potential encoding issues
    const cleanedContent = fileContent
      .replace(/\0/g, '') // Remove null bytes
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n'); // Handle old Mac line endings
    
    const parsed = Papa.parse(cleanedContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      quoteChar: '"',
      escapeChar: '"',
      transformHeader: (header) => header.trim(), // Clean headers
    });

    // Log parsing errors if any
    if (parsed.errors && parsed.errors.length > 0) {
      this.logger.warn(`CSV parsing errors found:`, parsed.errors.slice(0, 5)); // Log first 5 errors
    }

    return this.mapRowsToSalesData(parsed.data, marketplace);
  }

  private async parseExcelFile(filePath: string, marketplace: Marketplace) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    return this.mapRowsToSalesData(data, marketplace);
  }

  private mapRowsToSalesData(rows: any[], marketplace: Marketplace) {
    return rows.map((row) => {
      if (marketplace === Marketplace.WILDBERRIES) {
        return this.mapWildberriesRow(row);
      } else if (marketplace === Marketplace.OZON) {
        return this.mapOzonRow(row);
      } else {
        throw new Error(`Unsupported marketplace: ${marketplace}`);
      }
    }).filter(Boolean); // Удаляем пустые строки
  }

  private mapWildberriesRow(row: any) {
    const dateField = row['Дата продажи'] || row['Date'] || row['date'];
    const skuField = row['Артикул WB'] || row['SKU'] || row['sku'];
    const nameField = row['Наименование'] || row['Product Name'] || row['name'];
    const priceField = row['Цена продажи'] || row['Price'] || row['price'];
    const quantityField = row['Количество'] || row['Quantity'] || row['quantity'];
    const commissionField = row['Комиссия WB'] || row['Commission'] || row['commission'];

    if (!dateField || !skuField || !nameField || !priceField || !quantityField) {
      return null;
    }

    // Additional validation for corrupted data
    const skuString = String(skuField).trim();
    const nameString = String(nameField).trim();
    
    // Skip rows with obviously corrupted data
    if (skuString.length < 3 || skuString.length > 20 || 
        nameString.length < 3 || nameString.length > 200 ||
        nameString.includes('\n') || nameString.includes(',')) {
      this.logger.warn(`Skipping corrupted row: SKU ${skuString}, Name: ${nameString.substring(0, 50)}...`);
      return null;
    }

    // Validate and parse date
    const parsedDate = this.parseAndValidateDate(dateField);
    if (!parsedDate) {
      this.logger.warn(`Invalid date field for SKU ${skuField}: ${dateField}`);
      return null;
    }

    // Validate numeric fields
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

    return {
      sku: skuString,
      productName: nameString,
      saleDate: parsedDate,
      quantity,
      price,
      commission: parseFloat(commissionField) || 0,
    };
  }

  private mapOzonRow(row: any) {
    const dateField = row['Дата'] || row['Date'] || row['date'];
    const skuField = row['Артикул'] || row['SKU'] || row['sku'];
    const nameField = row['Название товара'] || row['Product Name'] || row['name'];
    const priceField = row['Цена за единицу'] || row['Price'] || row['price'];
    const quantityField = row['Количество'] || row['Quantity'] || row['quantity'];
    const commissionField = row['Комиссия за продажу'] || row['Commission'] || row['commission'];

    if (!dateField || !skuField || !nameField || !priceField || !quantityField) {
      return null;
    }

    // Additional validation for corrupted data
    const skuString = String(skuField).trim();
    const nameString = String(nameField).trim();
    
    // Skip rows with obviously corrupted data
    if (skuString.length < 3 || skuString.length > 20 || 
        nameString.length < 3 || nameString.length > 200 ||
        nameString.includes('\n') || nameString.includes(',')) {
      this.logger.warn(`Skipping corrupted row: SKU ${skuString}, Name: ${nameString.substring(0, 50)}...`);
      return null;
    }

    // Validate and parse date
    const parsedDate = this.parseAndValidateDate(dateField);
    if (!parsedDate) {
      this.logger.warn(`Invalid date field for SKU ${skuField}: ${dateField}`);
      return null;
    }

    // Validate numeric fields
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

    return {
      sku: skuString,
      productName: nameString,
      saleDate: parsedDate,
      quantity,
      price,
      commission: parseFloat(commissionField) || 0,
    };
  }

  /**
   * Parse and validate date field
   * @param dateField - The date field from CSV/Excel
   * @returns Valid Date object or null if invalid
   */
  private parseAndValidateDate(dateField: any): Date | null {
    if (!dateField) {
      return null;
    }

    // Convert to string and trim whitespace
    const dateString = String(dateField).trim();
    
    // Skip if the field looks corrupted (contains product names or other non-date data)
    if (dateString.length > 50 || 
        /[а-яё]/i.test(dateString) || // Contains Cyrillic characters
        dateString.includes('"') ||
        dateString.includes('\n') ||
        /\d{10,}/.test(dateString) || // Contains long numbers (likely corrupted)
        /[,;:]{2,}/.test(dateString) || // Multiple delimiters
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
        dateString.includes('Матрас')) {
      return null;
    }

    // Try to parse the date
    let parsedDate: Date;
    
    // Handle different date formats
    if (dateString.includes('.')) {
      // DD.MM.YYYY format
      const parts = dateString.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        // Validate day and month ranges
        if (day < 1 || day > 31 || month < 1 || month > 12) {
          return null;
        }
        
        parsedDate = new Date(year, month - 1, day); // Month is 0-indexed
        
        // Check if the date rolled over (e.g., 32.01.2025 becomes 01.02.2025)
        if (parsedDate.getDate() !== day || parsedDate.getMonth() !== month - 1 || parsedDate.getFullYear() !== year) {
          return null;
        }
      } else {
        parsedDate = new Date(dateString);
      }
    } else if (dateString.includes('-')) {
      // YYYY-MM-DD format or similar
      parsedDate = new Date(dateString);
    } else if (dateString.includes('/')) {
      // MM/DD/YYYY or DD/MM/YYYY format
      parsedDate = new Date(dateString);
    } else {
      // Try parsing as-is
      parsedDate = new Date(dateString);
    }

    // Validate the parsed date
    if (isNaN(parsedDate.getTime())) {
      return null;
    }

    // Additional validation: check if date is reasonable (not too far in past/future)
    const currentYear = new Date().getFullYear();
    const dateYear = parsedDate.getFullYear();
    
    if (dateYear < 2020 || dateYear > currentYear + 1) {
      return null;
    }

    return parsedDate;
  }
}