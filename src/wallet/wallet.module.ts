import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { Wallet } from './entity/wallet.entity';
import { Transaction } from 'src/transaction/entity/transaction.entity';
import { Cart } from 'src/cart/entity/cart.entity';
import { Product } from 'src/product/entity/product.entity';
import { Order } from 'src/order/entity/order.entity';
import { User } from 'src/user/entity/user.entity';

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
