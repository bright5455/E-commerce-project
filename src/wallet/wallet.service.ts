import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entity/wallet.entity';
import { Transaction } from 'src/transaction/entity/transaction.entity';
import { Cart } from 'src/cart/entity/cart.entity';
import { Product } from 'src/product/entity/product.entity';
import { Order } from 'src/order/entity/order.entity';
import { User } from 'src/user/entity/user.entity';
import { AddFundsDto } from './dto/wallet.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getWallet(userId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
      relations: ['transactions'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      id: wallet.id,
      balance: Number(wallet.balance).toFixed(2),
      userId: wallet.userId,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
      recentTransactions: wallet.transactions.slice(0, 5), 
    };
  }

  async addFunds(userId: string, addFundsDto: AddFundsDto) {
    const wallet = await this.walletRepository.findOne({ where: { userId } });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    
    wallet.balance = Number(wallet.balance) + addFundsDto.amount;
    await this.walletRepository.save(wallet);

    
    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      amount: addFundsDto.amount,
      type: 'credit',
      description: 'Funds added to wallet',
    });

    await this.transactionRepository.save(transaction);

    return {
      message: 'Funds added successfully',
      newBalance: Number(wallet.balance).toFixed(2),
      transaction,
    };
  }

  async purchaseCart(userId: string) {
    
    const wallet = await this.walletRepository.findOne({ where: { userId } });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    
    const cartItems = await this.cartRepository.find({
      where: { userId },
      relations: ['product'],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let totalAmount = 0;
    const orderItems = [];

    
    for (const item of cartItems) {
      if (!item.product.isActive) {
        throw new BadRequestException(`Product ${item.product.name} is no longer available`);
      }

      if (item.product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.product.name}`);
      }

      const itemTotal = Number(item.product.price) * item.quantity;
      totalAmount += itemTotal;

     
    }

    
    const currentBalance = Number(wallet.balance);

if (currentBalance < totalAmount) {
  throw new BadRequestException(
    `Insufficient wallet balance. Required: $${totalAmount.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`
  );
}

    
    wallet.balance = Number(wallet.balance) - totalAmount;
    await this.walletRepository.save(wallet);


    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      amount: totalAmount,
      type: 'debit',
      description: `Purchase order - ${orderItems.length} items`,
    });
    await this.transactionRepository.save(transaction);

    
    for (const item of cartItems) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });

      if (product) {
        product.stock -= item.quantity;
        await this.productRepository.save(product);
      }
    }

    
    const order = this.orderRepository.create({
      userId,
      totalAmount,
      items: orderItems,
      status: 'pending',
    });
    await this.orderRepository.save(order);

    
    await this.cartRepository.remove(cartItems);

    const user = await this.userRepository.findOne({ where: { id: userId } });

    return {
      message: 'Purchase completed successfully',
      orderId: order.id,
      orderStatus: order.status,
      totalAmount: totalAmount.toFixed(2),
      newBalance: Number(wallet.balance).toFixed(2),
      itemsPurchased: orderItems.length,
      customerEmail: user?.email,
    };
  }

  async getTransactions(userId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
      relations: ['transactions'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    
    const transactions = wallet.transactions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    const summary = {
      totalCredits: transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalDebits: transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      transactionCount: transactions.length,
    };

    return {
      currentBalance: Number(wallet.balance).toFixed(2),
      summary,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: Number(t.amount).toFixed(2),
        type: t.type,
        description: t.description,
        date: t.createdAt,
      })),
    };
  }
}
