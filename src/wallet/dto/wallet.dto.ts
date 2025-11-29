import { IsNumber, Min , IsPositive,IsUUID,IsOptional,IsString,MaxLength} from 'class-validator';

export class AddFundsDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class TransferDto {
  @IsUUID()
  toUserId: string;   

  @IsNumber()
  @IsPositive()
  amount: number;

}

export class RefundDto {
  @IsUUID()
  orderId: string;   

  @IsNumber()
  @IsPositive()
  amount: number;    

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;   
}
