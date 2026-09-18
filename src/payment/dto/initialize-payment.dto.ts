import { IsUUID } from 'class-validator';

export class InitializePaymentDto {
  @IsUUID()
  orderId: string;
}
