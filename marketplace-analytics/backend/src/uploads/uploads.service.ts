import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { Marketplace } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('file-parsing') private fileParsingQueue: Queue,
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

    // Добавление задачи в очередь для обработки
    await this.fileParsingQueue.add('parse-file', {
      reportId: report.id,
      filePath,
      marketplace,
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

  private validateFile(file: Express.Multer.File) {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB

    if (!allowedTypes.includes(file.mimetype)) {
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