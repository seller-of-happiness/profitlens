import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private authService;
    constructor(configService: ConfigService, authService: AuthService);
    validate(payload: any): Promise<{
        reports: {
            id: string;
            fileName: string;
            marketplace: string;
            uploadDate: Date;
            processed: boolean;
            totalRevenue: number;
            totalProfit: number;
            profitMargin: number;
        }[];
        name: string | null;
        email: string;
        plan: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
