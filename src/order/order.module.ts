import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entity/order.entity';
import { OrderItem } from './entity/order-item.entity';
import { User } from '../user/entity/user.entity';
import { Wallet } from '../wallet/entity/wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, User, Wallet]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}