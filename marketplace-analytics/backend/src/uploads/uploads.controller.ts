import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseEnumPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Marketplace } from '@prisma/client';
import { UploadFileDto } from './dto/upload-file.dto';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Загрузить файл с данными продаж' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Файл с данными продаж',
    type: UploadFileDto,
  })
  @ApiResponse({ status: 201, description: 'Файл успешно загружен' })
  @ApiResponse({ status: 400, description: 'Неверный формат файла' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('marketplace', new ParseEnumPipe(Marketplace)) marketplace: Marketplace,
    @Request() req,
  ) {
    return this.uploadsService.uploadFile(file, req.user.id, marketplace);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех отчетов пользователя' })
  @ApiResponse({ status: 200, description: 'Список отчетов' })
  async getReports(@Request() req) {
    return this.uploadsService.getReports(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить детали конкретного отчета' })
  @ApiResponse({ status: 200, description: 'Детали отчета' })
  @ApiResponse({ status: 404, description: 'Отчет не найден' })
  async getReport(@Param('id') id: string, @Request() req) {
    return this.uploadsService.getReport(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить отчет' })
  @ApiResponse({ status: 200, description: 'Отчет удален' })
  @ApiResponse({ status: 404, description: 'Отчет не найден' })
  async deleteReport(@Param('id') id: string, @Request() req) {
    return this.uploadsService.deleteReport(id, req.user.id);
  }
}