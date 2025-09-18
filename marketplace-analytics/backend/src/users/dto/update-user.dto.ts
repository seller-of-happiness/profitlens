import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '../../common/constants';

export class UpdateUserDto {
  @ApiProperty({
    example: 'Иван Петров',
    description: 'Имя пользователя',
    required: false
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.START,
    description: 'Тарифный план',
    required: false
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;
}