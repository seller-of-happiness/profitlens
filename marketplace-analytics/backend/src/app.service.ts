import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Marketplace Analytics API is running! 🚀';
  }
}