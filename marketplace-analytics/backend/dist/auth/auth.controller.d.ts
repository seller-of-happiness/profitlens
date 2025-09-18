import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    getProfile(req: any): any;
}
