import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { FileParsingProcessor } from './processors/file-parsing.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    PrismaModule,
    AnalyticsModule,
    BullModule.registerQueue({
      name: 'file-parsing',
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, FileParsingProcessor],
  exports: [UploadsService],
})
export class UploadsModule {}