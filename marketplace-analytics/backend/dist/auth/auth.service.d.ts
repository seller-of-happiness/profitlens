import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<any>;
    login(loginDto: LoginDto): Promise<{
        user: any;
        accessToken: string;
    }>;
    register(registerDto: RegisterDto): Promise<{
        user: {
            name: string | null;
            email: string;
            plan: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
        };
        accessToken: string;
    }>;
    validateJwt(payload: any): Promise<{
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
