import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getCurrentUser(req: any): Promise<{
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
    } & {
        name: string | null;
        email: string;
        password: string;
        plan: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateCurrentUser(req: any, updateUserDto: UpdateUserDto): Promise<{
        name: string;
        email: string;
        plan: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteCurrentUser(req: any): Promise<{
        name: string | null;
        email: string;
        password: string;
        plan: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
