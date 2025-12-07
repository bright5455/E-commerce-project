import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from './entity/transaction.entity';
import { Wallet } from '../wallet/entity/wallet.entity';
import { User } from '../user/entity/user.entity';
import {
  CreateTransactionDto,
  TransactionQueryDto,
  DateRangeDto,
} from './dto/transaction.dto';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  async findOne(id: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['user', 'wallet'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async findAllByWallet(walletId: string, query: TransactionQueryDto) {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    const { page = 1, limit = 10, type, status, startDate, endDate, search, sortBy, sortOrder, minAmount, maxAmount } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.walletId = :walletId', { walletId });

    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('transaction.status = :status', { status });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    } else if (startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount <= :maxAmount', { maxAmount });
    }

    if (search) {
      queryBuilder.andWhere(
        '(transaction.description LIKE :search OR transaction.referenceId LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`transaction.${sortBy}`, sortOrder);
    queryBuilder.skip(skip).take(limit);

    const [transactions, total] = await queryBuilder.getManyAndCount();

    const summaryQuery = this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(CASE WHEN transaction.type IN (:...creditTypes) THEN transaction.amount ELSE 0 END)', 'totalCredits')
      .addSelect('SUM(CASE WHEN transaction.type IN (:...debitTypes) THEN transaction.amount ELSE 0 END)', 'totalDebits')
      .addSelect('COUNT(*)', 'totalTransactions')
      .where('transaction.walletId = :walletId', { walletId })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .setParameters({
        creditTypes: [
          TransactionType.DEPOSIT,
          TransactionType.REFUND,
          TransactionType.TRANSFER_IN,
          TransactionType.COMMISSION,
          TransactionType.BONUS,
        ],
        debitTypes: [
          TransactionType.WITHDRAWAL,
          TransactionType.PAYMENT,
          TransactionType.TRANSFER_OUT,
          TransactionType.PENALTY,
        ],
      });

    const summary = await summaryQuery.getRawOne();

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalCredits: parseFloat(summary.totalCredits || '0'),
        totalDebits: parseFloat(summary.totalDebits || '0'),
        totalTransactions: parseInt(summary.totalTransactions || '0'),
        currentBalance: Number(wallet.balance),
      },
    };
  }

  async findAll(query: TransactionQueryDto) {
    const { page = 1, limit = 10, type, status, startDate, endDate, search, sortBy, sortOrder, minAmount, maxAmount } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .leftJoinAndSelect('transaction.wallet', 'wallet');

    if (type) {
      queryBuilder.where('transaction.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('transaction.status = :status', { status });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    } else if (startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount <= :maxAmount', { maxAmount });
    }

    if (search) {
      queryBuilder.andWhere(
        '(transaction.description LIKE :search OR transaction.referenceId LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`transaction.${sortBy}`, sortOrder);
    queryBuilder.skip(skip).take(limit);

    const [transactions, total] = await queryBuilder.getManyAndCount();

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionsByDateRange(dateRangeDto: DateRangeDto) {
    const { startDate, endDate, type } = dateRangeDto;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .where('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      });

    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }

    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const transactions = await queryBuilder.getMany();

    const summaryQuery = this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(transaction.amount)', 'total')
      .where('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .groupBy('transaction.type');

    if (type) {
      summaryQuery.andWhere('transaction.type = :type', { type });
    }

    const summary = await summaryQuery.getRawMany();

    const creditTypes = [
      TransactionType.DEPOSIT,
      TransactionType.REFUND,
      TransactionType.TRANSFER_IN,
      TransactionType.COMMISSION,
      TransactionType.BONUS,
    ];

    let totalCredits = 0;
    let totalDebits = 0;

    summary.forEach((item) => {
      const amount = parseFloat(item.total);
      if (creditTypes.includes(item.type)) {
        totalCredits += amount;
      } else {
        totalDebits += amount;
      }
    });

    return {
      data: transactions,
      dateRange: {
        startDate,
        endDate,
      },
      summary: {
        byType: summary.map((item) => ({
          type: item.type,
          count: parseInt(item.count),
          total: parseFloat(item.total),
        })),
        totalCredits,
        totalDebits,
        netAmount: totalCredits - totalDebits,
        totalTransactions: transactions.length,
      },
    };
  }

  async create(createTransactionDto: CreateTransactionDto, ipAddress?: string, userAgent?: string) {
    const wallet = await this.walletRepository.findOne({
      where: { id: createTransactionDto.walletId },
    });

    if (!wallet) {
      throw new NotFoundException(
        `Wallet with ID ${createTransactionDto.walletId} not found`,
      );
    }

    const balanceBefore = Number(wallet.balance);
    let balanceAfter = balanceBefore;
    const amount = Number(createTransactionDto.amount);

    const creditTypes = [
      TransactionType.DEPOSIT,
      TransactionType.REFUND,
      TransactionType.TRANSFER_IN,
      TransactionType.COMMISSION,
      TransactionType.BONUS,
    ];

    const debitTypes = [
      TransactionType.WITHDRAWAL,
      TransactionType.PAYMENT,
      TransactionType.TRANSFER_OUT,
      TransactionType.PENALTY,
    ];

    if (creditTypes.includes(createTransactionDto.type)) {
      balanceAfter = balanceBefore + amount;
    } else if (debitTypes.includes(createTransactionDto.type)) {
      balanceAfter = balanceBefore - amount;

      if (balanceAfter < 0) {
        throw new BadRequestException(
          `Insufficient balance. Available: $${balanceBefore}, Required: $${amount}`,
        );
      }
    }

    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      userId: wallet.userId,
      type: createTransactionDto.type,
      amount,
      balanceBefore,
      balanceAfter,
      description: createTransactionDto.description,
      status: createTransactionDto.status || TransactionStatus.COMPLETED,
      referenceId: createTransactionDto.referenceId,
      referenceType: createTransactionDto.referenceType,
      metadata: createTransactionDto.metadata
        ? JSON.stringify(createTransactionDto.metadata)
        : null,
      ipAddress,
      userAgent,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    if (savedTransaction.status === TransactionStatus.COMPLETED) {
      wallet.balance = balanceAfter;
      await this.walletRepository.save(wallet);
    }

    this.logger.log(
      `Transaction created: ${savedTransaction.id} - ${createTransactionDto.type} - $${amount}`,
    );

    return savedTransaction;
  }

  async getTransactionStats() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const totalTransactions = await this.transactionRepository.count({
      where: { status: TransactionStatus.COMPLETED },
    });

    const transactionsByType = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(transaction.amount)', 'total')
      .where('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('transaction.type')
      .getRawMany();

    const transactionsByStatus = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('transaction.status')
      .getRawMany();

    const todayStats = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'totalAmount')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.createdAt >= :startOfDay', { startOfDay })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const thisMonthStats = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'totalAmount')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.createdAt >= :startOfMonth', { startOfMonth })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const lastMonthStats = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'totalAmount')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.createdAt BETWEEN :start AND :end', {
        start: startOfLastMonth,
        end: endOfLastMonth,
      })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const thisYearStats = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'totalAmount')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.createdAt >= :startOfYear', { startOfYear })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const largeTransactions = await this.transactionRepository.find({
      where: { status: TransactionStatus.COMPLETED },
      order: { amount: 'DESC', createdAt: 'DESC' },
      take: 10,
      relations: ['user'],
    });

    const recentTransactions = await this.transactionRepository.find({
      order: { createdAt: 'DESC' },
      take: 20,
      relations: ['user'],
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyVolume = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DATE(transaction.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(transaction.amount)', 'total')
      .where('transaction.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('DATE(transaction.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      overview: {
        totalTransactions,
        today: {
          amount: parseFloat(todayStats?.totalAmount || '0'),
          count: parseInt(todayStats?.count || '0'),
        },
        thisMonth: {
          amount: parseFloat(thisMonthStats?.totalAmount || '0'),
          count: parseInt(thisMonthStats?.count || '0'),
          growth: this.calculateGrowth(
            parseFloat(thisMonthStats?.totalAmount || '0'),
            parseFloat(lastMonthStats?.totalAmount || '0'),
          ),
        },
        lastMonth: {
          amount: parseFloat(lastMonthStats?.totalAmount || '0'),
          count: parseInt(lastMonthStats?.count || '0'),
        },
        thisYear: {
          amount: parseFloat(thisYearStats?.totalAmount || '0'),
          count: parseInt(thisYearStats?.count || '0'),
        },
      },
      byType: transactionsByType.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
        total: parseFloat(item.total),
      })),
      byStatus: transactionsByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      largeTransactions,
      recentTransactions,
      dailyVolume: dailyVolume.map((item) => ({
        date: item.date,
        count: parseInt(item.count),
        total: parseFloat(item.total),
      })),
    };
  }
}