import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Order, OrderStatus, PaymentMethod } from './entity/order.entity';
import { OrderItem } from './entity/order-item.entity';
import { User } from '../user/entity/user.entity';
import { Wallet } from '../wallet/entity/wallet.entity';
import {
  CreateOrderDto,
  CheckoutDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  OrderQueryDto,
} from './dto/order.dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly dataSource: DataSource,
  ) {}

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
      [OrderStatus.CANCELLED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }


  async create(userId: string, createOrderDto: CreateOrderDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      let subtotal = 0;
      const orderItems: Partial<OrderItem>[] = [];

      for (const item of createOrderDto.items) {
        const productPrice = 100; 
        const productName = 'Product Name'; 
        const productImage = 'image.jpg'; 

        const itemTotal = productPrice * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: item.productId,
          productName,
          productImage,
          price: productPrice,
          quantity: item.quantity,
          total: itemTotal,
        });
      }

      const tax = subtotal * 0.1; 
      const shippingFee = subtotal > 500 ? 0 : 50; 
      const total = subtotal + tax + shippingFee;

      const order = this.orderRepository.create({
        userId,
        subtotal,
        tax,
        shippingFee,
        total,
        status: OrderStatus.PENDING,
        paymentMethod: createOrderDto.paymentMethod ?? PaymentMethod.WALLET, 
        shippingAddress: createOrderDto.shippingAddress,
        shippingCity: createOrderDto.shippingCity,
        shippingState: createOrderDto.shippingState,
        shippingZipCode: createOrderDto.shippingZipCode,
        shippingCountry: createOrderDto.shippingCountry,
        phoneNumber: createOrderDto.phoneNumber,
        notes: createOrderDto.notes,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      for (const item of orderItems) {
        const orderItem = this.orderItemRepository.create({
          ...item,
          orderId: savedOrder.id,
        });
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Order created: ${savedOrder.id} for user: ${userId}`);

      return this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create order:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async checkout(userId: string, checkoutDto: CheckoutDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cartItems = [
        { productId: 'product-1', quantity: 2, price: 100 },
        { productId: 'product-2', quantity: 1, price: 200 },
      ];

      if (cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      for (const item of cartItems) {
        const availableStock = 10; 
        if (item.quantity > availableStock) {
          throw new BadRequestException(
            `Insufficient stock for product ${item.productId}`,
          );
        }
      }

      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const tax = subtotal * 0.1;
      const shippingFee = subtotal > 500 ? 0 : 50;
      const total = subtotal + tax + shippingFee;

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.balance < total) {
        throw new BadRequestException(
          `Insufficient wallet balance. Required: $${total}, Available: $${wallet.balance}`,
        );
      }

      wallet.balance = Number(wallet.balance) - total;
      await queryRunner.manager.save(wallet);

      const order = this.orderRepository.create({
        userId,
        subtotal,
        tax,
        shippingFee,
        total,
        status: OrderStatus.PROCESSING,
        paymentMethod: checkoutDto.paymentMethod || PaymentMethod.WALLET,
        isPaid: true,
        paidAt: new Date(),
        shippingAddress: checkoutDto.shippingAddress,
        shippingCity: checkoutDto.shippingCity,
        shippingState: checkoutDto.shippingState,
        shippingZipCode: checkoutDto.shippingZipCode,
        shippingCountry: checkoutDto.shippingCountry,
        phoneNumber: checkoutDto.phoneNumber,
        notes: checkoutDto.notes,
      });

      const savedOrder = await queryRunner.manager.save(order);

      for (const item of cartItems) {
        const orderItem = this.orderItemRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          productName: 'Product Name', 
          productImage: 'image.jpg', 
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
        });
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Checkout completed: Order ${savedOrder.id} for user ${userId}`);

      return this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Checkout failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'user'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findAllByUser(userId: string, query: OrderQueryDto) {
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(order.id LIKE :search OR order.trackingNumber LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`order.${sortBy}`, sortOrder);
    queryBuilder.skip(skip).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll(query: OrderQueryDto) {
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.user', 'user');

    if (status) {
      queryBuilder.where('order.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(order.id LIKE :search OR user.email LIKE :search OR order.trackingNumber LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`order.${sortBy}`, sortOrder);
    queryBuilder.skip(skip).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto) {
    const order = await this.findOne(id);

    this.validateStatusTransition(order.status, updateStatusDto.status);

    order.status = updateStatusDto.status;

    if (updateStatusDto.trackingNumber) {
      order.trackingNumber = updateStatusDto.trackingNumber;
    }

    if (updateStatusDto.notes) {
      order.notes = updateStatusDto.notes;
    }

    if (updateStatusDto.status === OrderStatus.SHIPPED) {
      order.shippedAt = new Date();
    } else if (updateStatusDto.status === OrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
    } else if (updateStatusDto.status === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
    }

    await this.orderRepository.save(order);

    this.logger.log(`Order ${id} status updated to ${updateStatusDto.status}`);

    return order;
  }

  async cancel(id: string, userId: string, cancelDto: CancelOrderDto) {
    const order = await this.findOne(id);

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (![OrderStatus.PENDING, OrderStatus.PROCESSING].includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.cancellationReason = cancelDto.reason;

      await queryRunner.manager.save(order);

      if (order.isPaid) {
        const wallet = await queryRunner.manager.findOne(Wallet, {
          where: { userId },
        });

        if (wallet) {
          wallet.balance = Number(wallet.balance) + Number(order.total);
          await queryRunner.manager.save(wallet);

          this.logger.log(
            `Refunded $${order.total} to wallet for cancelled order ${id}`,
          );
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Order ${id} cancelled by user ${userId}`);

      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to cancel order:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrderStats() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const totalOrders = await this.orderRepository.count();

    const ordersByStatus = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();

    const revenueThisMonth = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.createdAt >= :startOfMonth', { startOfMonth })
      .andWhere('order.isPaid = :isPaid', { isPaid: true })
      .getRawOne();

    const revenueLastMonth = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.createdAt BETWEEN :start AND :end', {
        start: startOfLastMonth,
        end: endOfLastMonth,
      })
      .andWhere('order.isPaid = :isPaid', { isPaid: true })
      .getRawOne();

    const ordersThisMonth = await this.orderRepository.count({
      where: {
        createdAt: Between(startOfMonth, today),
      },
    });

    const topProducts = await this.orderItemRepository
      .createQueryBuilder('item')
      .select('item.productName', 'productName')
      .addSelect('item.productId', 'productId')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.total)', 'totalRevenue')
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .orderBy('"totalQuantity"', 'DESC')
      .limit(10)
      .getRawMany();

    const recentOrders = await this.orderRepository.find({
      take: 10,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });

    return {
      totalOrders,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      revenue: {
        thisMonth: parseFloat(revenueThisMonth?.total || '0'),
        lastMonth: parseFloat(revenueLastMonth?.total || '0'),
        growth: this.calculateGrowth(
          parseFloat(revenueThisMonth?.total || '0'),
          parseFloat(revenueLastMonth?.total || '0'),
        ),
      },
      orders: {
        thisMonth: ordersThisMonth,
      },
      topProducts,
      recentOrders,
    };
  }
}