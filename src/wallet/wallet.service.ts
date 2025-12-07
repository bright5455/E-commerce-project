import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entity/wallet.entity';
import { Transaction, TransactionType } from '../transaction/entity/transaction.entity';
import { User } from '../user/entity/user.entity';
import { Order } from '../order/entity/order.entity';

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

  async getTransactionHistory(userId: string, page = 1, limit = 10) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const [transactions, total] = await this.transactionRepo.findAndCount({
      where: { wallet },
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

  async deposit(userId: string, amount: number, description = 'Deposit') {
    if (amount <= 0) {
      throw new BadRequestException('Deposit amount must be greater than zero');
    }

    return await this.walletRepo.manager.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { userId } });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      wallet.balance += amount;
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        wallet,
        amount,
        type: TransactionType.DEPOSIT,
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
        wallet,
        amount,
        type: TransactionType.WITHDRAWAL,
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
        wallet: sender,
        amount,
        type: TransactionType.WITHDRAWAL,
        description: `Transfer to user ${toUserId}`,
      });

      const receiverTx = manager.create(Transaction, {
        wallet: receiver,
        amount,
        type: TransactionType.DEPOSIT,
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


  async refund(userId: string, orderId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    return await this.walletRepo.manager.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { userId } });
      const order = await manager.findOne(Order, { where: { id: orderId, userId } });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      wallet.balance += amount;
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        wallet,
        amount,
        type: TransactionType.DEPOSIT,
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