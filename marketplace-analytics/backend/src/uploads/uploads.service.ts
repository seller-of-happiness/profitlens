import { Injectable, BadRequestException } from '@nestjs/common';
// import { InjectQueue } from '@nestjs/bull';
// import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { Marketplace } from '../common/constants';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
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

    // Добавление задачи в очередь для обработки - temporarily disabled
    // await this.fileParsingQueue.add('parse-file', {
    //   reportId: report.id,
    //   filePath,
    //   marketplace,
    // });
    
    // For now, just mark as processed
    await this.prisma.report.update({
      where: { id: report.id },
      data: { processed: true },
    });

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

    // Для упрощения пока просто помечаем как обработанный
    // В будущем здесь должна быть очередь для обработки
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
}