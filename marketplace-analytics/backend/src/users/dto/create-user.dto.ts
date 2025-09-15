import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'hashedpassword',
    description: 'Хешированный пароль'
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    example: 'Иван Иванов',
    description: 'Имя пользователя',
    required: false
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.FREE,
    description: 'Тарифный план',
    required: false
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;
}