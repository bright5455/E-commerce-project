import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
  ValidateNested,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentMethod } from '../entity/order.entity';

export class CreateOrderItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @IsString()
  @IsNotEmpty()
  shippingCity: string;

  @IsString()
  @IsNotEmpty()
  shippingState: string;

  @IsString()
  @IsNotEmpty()
  shippingZipCode: string;

  @IsString()
  @IsNotEmpty()
  shippingCountry: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @IsString()
  @IsNotEmpty()
  shippingCity: string;

  @IsString()
  @IsNotEmpty()
  shippingState: string;

  @IsString()
  @IsNotEmpty()
  shippingZipCode: string;

  @IsString()
  @IsNotEmpty()
  shippingCountry: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class OrderQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}