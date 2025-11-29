import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entity/wallet.entity';
import { Transaction } from 'src/transaction/entity/transaction.entity';
import { User } from 'src/user/entity/user.entity';
import { Order } from 'src/order/entity/order.entity';

// TODO: Implement WalletService with the following methods:
// - getBalance(userId): Get wallet balance
// - deposit(userId, amount, description): Add funds to wallet
// - withdraw(userId, amount, description): Deduct from wallet (for purchases)
// - transfer(fromUserId, toUserId, amount): Transfer between wallets
// - getTransactionHistory(userId, query): Get transactions with pagination
// - refund(userId, orderId, amount): Process refund to wallet
// 
// IMPORTANT: Use database transactions for all balance modifications!

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}


  async getBalance(userId: string) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      walletId: wallet.id,
      balance: Number(wallet.balance).toFixed(2),
    };
  }

  
  async deposit(userId: string, amount: number, description = 'Deposit') {
    if (amount <= 0) {
      throw new BadRequestException('Deposit amount must be greater than zero');
    }

    return await this.walletRepo.manager.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { userId } });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      wallet.balance = Number(wallet.balance) + amount;
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: 'credit',
        description,
      });

      await manager.save(transaction);

      return {
        message: 'Deposit successful',
        newBalance: wallet.balance.toFixed(2),
        transaction,
      };
    });
  }

  
  async withdraw(userId: string, amount: number, description = 'Withdrawal') {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return await this.walletRepo.manager.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { userId } });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.balance < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      wallet.balance -= amount;
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: 'debit',
        description,
      });

      await manager.save(transaction);

      return {
        message: 'Withdrawal successful',
        remainingBalance: wallet.balance.toFixed(2),
        transaction,
      };
    });
  }

  
  async transfer(fromUserId: string, toUserId: string, amount: number) {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot transfer to the same wallet');
    }

    if (amount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than zero');
    }

    return await this.walletRepo.manager.transaction(async (manager) => {
      const sender = await manager.findOne(Wallet, { where: { userId: fromUserId } });
      const receiver = await manager.findOne(Wallet, { where: { userId: toUserId } });

      if (!sender || !receiver) {
        throw new NotFoundException('One or both wallets were not found');
      }

      if (sender.balance < amount) {
        throw new BadRequestException('Insufficient balance for transfer');
      }

      sender.balance -= amount;
      receiver.balance += amount;

      await manager.save([sender, receiver]);

      const senderTx = manager.create(Transaction, {
        walletId: sender.id,
        amount,
        type: 'debit',
        description: `Transfer to user ${toUserId}`,
      });

      const receiverTx = manager.create(Transaction, {
        walletId: receiver.id,
        amount,
        type: 'credit',
        description: `Transfer from user ${fromUserId}`,
      });

      await manager.save([senderTx, receiverTx]);

      return {
        message: 'Transfer successful',
        senderBalance: sender.balance.toFixed(2),
        receiverBalance: receiver.balance.toFixed(2),
      };
    });
  }

  
  async getTransactionHistory(userId: string, page = 1, limit = 10) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const [transactions, total] = await this.transactionRepo.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      page,
      limit,
      total,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount).toFixed(2),
        type: t.type,
        description: t.description,
        date: t.createdAt,
      })),
    };
  }

  
  async refund(userId: string, orderId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    return await this.walletRepo.manager.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { userId } });
      const order = await manager.findOne(Order, { where: { id: orderId, userId } });

      if (!wallet) throw new NotFoundException('Wallet not found');
      if (!order) throw new NotFoundException('Order not found');

      wallet.balance += amount;
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: 'credit',
        description: `Refund for order ${orderId}`,
      });

      await manager.save(transaction);

      return {
        message: 'Refund processed successfully',
        refundedAmount: amount.toFixed(2),
        newBalance: wallet.balance.toFixed(2),
      };
    });
  }
}
