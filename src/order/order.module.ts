import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entity/order.entity';
import { OrderItem } from './entity/order-item.entity';
import { User } from '../user/entity/user.entity';
import { Wallet } from '../wallet/entity/wallet.entity';
import { Cart } from '../cart/entity/cart.entity';
import { Product } from '../product/entity/product.entity';
import { PaystackModule } from '../payment/paystack/paystack.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, User, Wallet, Cart, Product]),
    PaystackModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}