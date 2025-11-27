import { IsNumber, Min } from 'class-validator';

export class AddFundsDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}
