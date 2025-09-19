import { Injectable, BadRequestException } from '@nestjs/common';
// import { InjectQueue } from '@nestjs/bull';
// import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Marketplace } from '../common/constants';
import * as path from 'path';
import * as fs from 'fs';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
    // @InjectQueue('file-parsing') private fileParsingQueue: Queue,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    marketplace: Marketplace,
  ) {
    // Валидация файла
    this.validateFile(file);

    // Создание записи отчета в БД
    const report = await this.prisma.report.create({
      data: {
        userId,
        fileName: file.originalname,
        marketplace,
        processed: false,
      },
    });

    // Сохранение файла
    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, `${report.id}_${file.originalname}`);
    fs.writeFileSync(filePath, file.buffer);

    // Синхронная обработка файла
    try {
      await this.processFileSync(report.id, filePath, marketplace);
      console.log(`✅ Файл ${file.originalname} успешно обработан`);
    } catch (error) {
      console.error(`❌ Ошибка обработки файла ${file.originalname}:`, error.message);
      // Помечаем как необработанный в случае ошибки
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

  async getReports(userId: string) {
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

  async getReport(reportId: string, userId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, userId },
      include: {
        salesData: {
          orderBy: { saleDate: 'desc' },
        },
      },
    });

    if (!report) {
      throw new BadRequestException('Отчет не найден');
    }

    return report;
  }

  async deleteReport(reportId: string, userId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new BadRequestException('Отчет не найден');
    }

    // Удаление файла
    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    const filePath = path.join(uploadDir, `${report.id}_${report.fileName}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Удаление записи из БД
    await this.prisma.report.delete({
      where: { id: reportId },
    });

    return { message: 'Отчет удален' };
  }

  async deleteAllReports(userId: string) {
    const reports = await this.prisma.report.findMany({
      where: { userId },
    });

    if (reports.length === 0) {
      return { message: 'Нет отчетов для удаления', deletedCount: 0 };
    }

    // Удаление всех файлов
    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    reports.forEach((report) => {
      const filePath = path.join(uploadDir, `${report.id}_${report.fileName}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Удаление всех записей из БД (каскадное удаление удалит и salesData)
    await this.prisma.report.deleteMany({
      where: { userId },
    });

    return { 
      message: `Удалено отчетов: ${reports.length}`, 
      deletedCount: reports.length 
    };
  }

  async replaceReport(
    reportId: string,
    newFile: Express.Multer.File,
    userId: string,
    marketplace: Marketplace,
  ) {
    // Проверяем существование отчета
    const existingReport = await this.prisma.report.findFirst({
      where: { id: reportId, userId },
    });

    if (!existingReport) {
      throw new BadRequestException('Отчет не найден');
    }

    // Валидация нового файла
    this.validateFile(newFile);

    // Удаление старого файла
    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    const oldFilePath = path.join(uploadDir, `${reportId}_${existingReport.fileName}`);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }

    // Сохранение нового файла
    const newFilePath = path.join(uploadDir, `${reportId}_${newFile.originalname}`);
    fs.writeFileSync(newFilePath, newFile.buffer);

    // Удаление старых данных продаж
    await this.prisma.salesData.deleteMany({
      where: { reportId },
    });

    // Обновление записи отчета
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

    // Для упрощения пока просто помечаем как обработанный (TODO: implement proper file processing)
    await this.prisma.report.update({
      where: { id: reportId },
      data: { processed: true },
    });

    return {
      reportId,
      message: 'Отчет успешно заменен',
    };
  }

  private validateFile(file: Express.Multer.File) {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'text/plain', // .csv sometimes detected as plain text
      'application/csv', // .csv alternative mimetype
    ];

    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB

    // Check by extension if mimetype validation fails
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    const isValidType = allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension);

    if (!isValidType) {
      throw new BadRequestException(
        'Неподдерживаемый формат файла. Разрешены только Excel (.xlsx, .xls) и CSV (.csv) файлы',
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException(
        `Размер файла превышает допустимый лимит (${Math.round(maxSize / 1024 / 1024)}MB)`,
      );
    }
  }

  private async processFileSync(reportId: string, filePath: string, marketplace: Marketplace) {
    console.log(`🔄 Начинаем обработку файла: ${filePath}`);
    
    const fileExtension = path.extname(filePath).toLowerCase();
    let parsedData: any[];
    
    try {
      if (fileExtension === '.csv') {
        parsedData = await this.parseCsvFile(filePath);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        parsedData = await this.parseExcelFile(filePath);
      } else {
        throw new Error(`Неподдерживаемый формат файла: ${fileExtension}`);
      }
      
      console.log(`📊 Парсинг завершен, найдено строк: ${parsedData.length}`);
      
      // Маппинг данных в зависимости от маркетплейса
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
        } catch (error) {
          console.warn(`⚠️ Ошибка обработки строки: ${error.message}`);
          errorCount++;
        }
      }
      
      console.log(`✅ Обработано строк: ${processedCount}, ошибок: ${errorCount}`);
      
      if (salesData.length === 0) {
        throw new Error('Не удалось обработать ни одной строки данных');
      }
      
      // Сохранение в базу данных
      await this.prisma.$transaction(async (tx) => {
        // Удаляем старые данные для этого отчета
        await tx.salesData.deleteMany({
          where: { reportId }
        });
        
        // Сохраняем новые данные
        await tx.salesData.createMany({
          data: salesData
        });
        
        // Рассчитываем общие метрики
        const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
        const totalProfit = salesData.reduce((sum, item) => sum + item.netProfit, 0);
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        
        // Обновляем отчет
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
      
    } catch (error) {
      console.error(`❌ Ошибка обработки файла:`, error.message);
      throw error;
    }
  }
  
  private async parseCsvFile(filePath: string): Promise<any[]> {
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
  
  private async parseExcelFile(filePath: string): Promise<any[]> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }
  
  private mapRowToSalesData(row: any, marketplace: Marketplace) {
    if (marketplace === Marketplace.OZON) {
      const dateStr = row['Дата'];
      const sku = row['Артикул'];
      const productName = row['Название товара'];
      const price = parseFloat(row['Цена за единицу']) || 0;
      const quantity = parseInt(row['Количество']) || 0;
      const commission = parseFloat(row['Комиссия за продажу']) || 0;
      
      if (!dateStr || !sku || !productName || price <= 0 || quantity <= 0) {
        return null;
      }
      
      // Парсинг даты DD.MM.YYYY
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
    } else if (marketplace === Marketplace.WILDBERRIES) {
      const dateStr = row['Дата продажи'];
      const sku = row['Артикул WB'];
      const productName = row['Наименование'];
      const price = parseFloat(row['Цена продажи']) || 0;
      const quantity = parseInt(row['Количество']) || 0;
      const commission = parseFloat(row['Комиссия WB']) || 0;
      
      if (!dateStr || !sku || !productName || price <= 0 || quantity <= 0) {
        return null;
      }
      
      // Парсинг даты (может быть в разных форматах)
      let saleDate: Date;
      if (dateStr.includes('.')) {
        const dateParts = dateStr.split('.');
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]);
          const year = parseInt(dateParts[2]);
          saleDate = new Date(year, month - 1, day);
        }
      } else {
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
}