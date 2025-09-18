import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Marketplace } from '../../common/constants';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Файл с данными продаж (Excel или CSV)',
  })
  file: any;

  @ApiProperty({
    enum: Marketplace,
    example: Marketplace.WILDBERRIES,
    description: 'Маркетплейс, с которого загружается отчет',
  })
  @IsEnum(Marketplace)
  marketplace: Marketplace;
}