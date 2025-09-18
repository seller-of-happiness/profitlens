import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<{
        name: string | null;
        email: string;
        password: string;
        plan: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        name: string;
        email: string;
        plan: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findById(id: string): Promise<{
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
    findByEmail(email: string): Promise<{
        name: string | null;
        email: string;
        password: string;
        plan: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        name: string;
        email: string;
        plan: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        name: string | null;
        email: string;
        password: string;
        plan: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
