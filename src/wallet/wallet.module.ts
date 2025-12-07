import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { Wallet } from './entity/wallet.entity';
import { Transaction } from '../transaction/entity/transaction.entity';
import { Cart } from '../cart/entity/cart.entity';
import { Product } from '../product/entity/product.entity';
import { Order } from '../order/entity/order.entity';
import { User } from '../user/entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      Transaction,
      Cart,
      Product,
      Order,
      User,
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
