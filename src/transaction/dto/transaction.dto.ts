import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
  IsObject,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, TransactionStatus } from '../entity/transaction.entity';

export class CreateTransactionDto {
  @IsUUID()
  walletId: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;

  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;
}

export class TransactionQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxAmount?: number;
}

export class DateRangeDto {
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;
}