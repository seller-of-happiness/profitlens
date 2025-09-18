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
const path = require("path");
const fs = require("fs");
let UploadsService = class UploadsService {
    constructor(prisma) {
        this.prisma = prisma;
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
        await this.prisma.report.update({
            where: { id: report.id },
            data: { processed: true },
        });
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
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map