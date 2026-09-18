import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaystackModule } from './paystack/paystack.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [PaystackModule, OrderModule],
  controllers: [PaymentController],
})
export class PaymentModule {}
