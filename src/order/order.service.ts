import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, EntityManager } from 'typeorm';
import { Order, OrderStatus, PaymentMethod } from './entity/order.entity';
import { OrderItem } from './entity/order-item.entity';
import { User } from '../user/entity/user.entity';
import { Wallet } from '../wallet/entity/wallet.entity';
import { Cart } from '../cart/entity/cart.entity';
import { Product } from '../product/entity/product.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../transaction/entity/transaction.entity';
import {
  CreateOrderDto,
  CheckoutDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  OrderQueryDto,
} from './dto/order.dto';
import { PaystackService } from '../payment/paystack/paystack.service';

interface VerifiedPayment {
  status: string;
  amountKobo: number;
  raw: any;
}

export interface PaymentInitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

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
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly paystackService: PaystackService,
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


  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private calculateTotals(subtotal: number) {
    const tax = this.round(subtotal * 0.1);
    const shippingFee = subtotal > 500 ? 0 : 50;
    return { tax, shippingFee, total: this.round(subtotal + tax + shippingFee) };
  }

  /** Reads the caller's cart, validates stock/availability, and computes order totals. */
  private async buildOrderItemsFromCart(manager: EntityManager, userId: string) {
    const cartItems = await manager.find(Cart, {
      where: { userId },
      relations: ['product'],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const item of cartItems) {
      const product = item.product;

      if (!product || !product.isActive) {
        throw new BadRequestException(
          `${product?.name ?? 'A product in your cart'} is no longer available`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${item.quantity}`,
        );
      }

      const price = Number(product.price);
      const itemTotal = this.round(price * item.quantity);
      subtotal = this.round(subtotal + itemTotal);

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        price,
        quantity: item.quantity,
        total: itemTotal,
      });
    }

    const { tax, shippingFee, total } = this.calculateTotals(subtotal);

    return { cartItems, orderItems, subtotal, tax, shippingFee, total };
  }

  /** Decrements stock, writes the payment Transaction record, and clears the cart. */
  private async applyFulfillment(
    manager: EntityManager,
    params: {
      orderId: string;
      items: { productId: string; quantity: number }[];
      walletId: string;
      userId: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      description: string;
      metadata?: any;
    },
  ): Promise<void> {
    for (const item of params.items) {
      await manager.decrement(Product, { id: item.productId }, 'stock', item.quantity);
    }

    await manager.save(
      Transaction,
      manager.create(Transaction, {
        walletId: params.walletId,
        userId: params.userId,
        type: TransactionType.PAYMENT,
        amount: params.amount,
        balanceBefore: params.balanceBefore,
        balanceAfter: params.balanceAfter,
        status: TransactionStatus.COMPLETED,
        description: params.description,
        referenceId: params.orderId,
        referenceType: 'order',
        metadata: params.metadata,
      }),
    );

    await manager.delete(Cart, { userId: params.userId });
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

      if (!createOrderDto.items?.length) {
        throw new BadRequestException('Order must contain at least one item');
      }

      let subtotal = 0;
      const orderItems: Partial<OrderItem>[] = [];

      for (const item of createOrderDto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        if (!product.isActive) {
          throw new BadRequestException(`${product.name} is no longer available`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${item.quantity}`,
          );
        }

        const price = Number(product.price);
        const itemTotal = this.round(price * item.quantity);
        subtotal = this.round(subtotal + itemTotal);

        orderItems.push({
          productId: product.id,
          productName: product.name,
          productImage: product.imageUrl,
          price,
          quantity: item.quantity,
          total: itemTotal,
        });
      }

      const { tax, shippingFee, total } = this.calculateTotals(subtotal);

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
        await queryRunner.manager.save(
          OrderItem,
          this.orderItemRepository.create({ ...item, orderId: savedOrder.id }),
        );
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

  async checkout(
    userId: string,
    checkoutDto: CheckoutDto,
  ): Promise<Order | { order: Order; payment: PaymentInitResult }> {
    const method = checkoutDto.paymentMethod ?? PaymentMethod.WALLET;

    if (method !== PaymentMethod.WALLET) {
      return this.checkoutWithPaystack(userId, checkoutDto, method);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { cartItems, orderItems, subtotal, tax, shippingFee, total } =
        await this.buildOrderItemsFromCart(queryRunner.manager, userId);

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = Number(wallet.balance);

      if (balanceBefore < total) {
        throw new BadRequestException(
          `Insufficient wallet balance. Required: ${total.toFixed(2)}, available: ${balanceBefore.toFixed(2)}`,
        );
      }

      const balanceAfter = this.round(balanceBefore - total);
      wallet.balance = balanceAfter;
      await queryRunner.manager.save(Wallet, wallet);

      const order = this.orderRepository.create({
        userId,
        subtotal,
        tax,
        shippingFee,
        total,
        status: OrderStatus.PROCESSING,
        paymentMethod: PaymentMethod.WALLET,
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

      const savedOrder = await queryRunner.manager.save(Order, order);

      for (const item of orderItems) {
        await queryRunner.manager.save(
          OrderItem,
          this.orderItemRepository.create({ ...item, orderId: savedOrder.id }),
        );
      }

      await this.applyFulfillment(queryRunner.manager, {
        orderId: savedOrder.id,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        walletId: wallet.id,
        userId,
        amount: total,
        balanceBefore,
        balanceAfter,
        description: `Payment for order ${savedOrder.id}`,
      });

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

  /**
   * Card/bank-transfer checkout: creates a PENDING, unpaid order from the cart
   * (wallet/stock/cart untouched), then initializes a Paystack transaction for it.
   * The order is only fulfilled later by finalizePaidOrder(), driven by the
   * verify endpoint and/or the Paystack webhook.
   */
  private async checkoutWithPaystack(
    userId: string,
    checkoutDto: CheckoutDto,
    method: PaymentMethod,
  ): Promise<{ order: Order; payment: PaymentInitResult }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedOrder: Order;

    try {
      const { orderItems, subtotal, tax, shippingFee, total } =
        await this.buildOrderItemsFromCart(queryRunner.manager, userId);

      const order = this.orderRepository.create({
        userId,
        subtotal,
        tax,
        shippingFee,
        total,
        status: OrderStatus.PENDING,
        paymentMethod: method,
        isPaid: false,
        shippingAddress: checkoutDto.shippingAddress,
        shippingCity: checkoutDto.shippingCity,
        shippingState: checkoutDto.shippingState,
        shippingZipCode: checkoutDto.shippingZipCode,
        shippingCountry: checkoutDto.shippingCountry,
        phoneNumber: checkoutDto.phoneNumber,
        notes: checkoutDto.notes,
      });

      savedOrder = await queryRunner.manager.save(Order, order);

      for (const item of orderItems) {
        await queryRunner.manager.save(
          OrderItem,
          this.orderItemRepository.create({ ...item, orderId: savedOrder.id }),
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Checkout (card) failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Never hold a DB transaction open across an external HTTP call.
    const payment = await this.initiatePaystackPayment(savedOrder, userId);

    return { order: await this.findOne(savedOrder.id), payment };
  }

  private async initiatePaystackPayment(
    order: Order,
    userId: string,
  ): Promise<PaymentInitResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payment = await this.paystackService.initializeTransaction({
      email: user.email,
      amountNaira: Number(order.total),
      orderId: order.id,
      callbackPath: '/checkout/callback',
    });

    await this.orderRepository.update(order.id, {
      paymentReference: payment.reference,
    });

    return {
      authorizationUrl: payment.authorization_url,
      accessCode: payment.access_code,
      reference: payment.reference,
    };
  }

  /** Re-initializes a fresh Paystack payment session for an unpaid, pending card order. */
  async retryPayment(
    orderId: string,
    userId: string,
  ): Promise<{ order: Order; payment: PaymentInitResult }> {
    const order = await this.findOne(orderId);

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only retry payment on your own orders');
    }

    if (order.paymentMethod === PaymentMethod.WALLET) {
      throw new BadRequestException('Wallet orders cannot be retried through Paystack');
    }

    if (order.isPaid || order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('This order is not awaiting payment');
    }

    const payment = await this.initiatePaystackPayment(order, userId);

    return { order: await this.findOne(order.id), payment };
  }

  /**
   * Idempotently finalizes a Paystack-paid order: called by both the frontend's
   * verify request and the webhook, whichever arrives first "wins". A row lock
   * plus the isPaid check prevent double-fulfillment from Paystack's at-least-once
   * webhook delivery.
   */
  async finalizePaidOrder(reference: string, verified: VerifiedPayment): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Locked via createQueryBuilder with no relations joined: Postgres refuses
      // FOR UPDATE combined with a LEFT JOIN on the nullable side, which is what
      // Order.items being an eager relation would otherwise produce here.
      const order = await queryRunner.manager
        .createQueryBuilder(Order, 'order')
        .where('order.paymentReference = :reference', { reference })
        .setLock('pessimistic_write')
        .getOne();

      if (!order) {
        throw new NotFoundException(`No order found for reference ${reference}`);
      }

      const items = await queryRunner.manager.find(OrderItem, {
        where: { orderId: order.id },
      });

      if (order.isPaid) {
        await queryRunner.rollbackTransaction();
        return order;
      }

      if (verified.status !== 'success') {
        this.logger.warn(
          `Payment for order ${order.id} not successful (status: ${verified.status})`,
        );
        await queryRunner.rollbackTransaction();
        return order;
      }

      const expectedKobo = Math.round(Number(order.total) * 100);
      if (expectedKobo !== verified.amountKobo) {
        this.logger.error(
          `Amount mismatch for order ${order.id}: expected ${expectedKobo} kobo, received ${verified.amountKobo} kobo`,
        );
        throw new BadRequestException('Payment amount does not match order total');
      }

      for (const item of items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product || product.stock < item.quantity) {
          this.logger.error(
            `Insufficient stock finalizing order ${order.id} for product ${item.productId}`,
          );
          throw new BadRequestException(`Insufficient stock for ${item.productName}`);
        }
      }

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: order.userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found for order owner');
      }

      const walletBalance = Number(wallet.balance);

      await this.applyFulfillment(queryRunner.manager, {
        orderId: order.id,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        walletId: wallet.id,
        userId: order.userId,
        amount: Number(order.total),
        balanceBefore: walletBalance,
        balanceAfter: walletBalance,
        description: `Paystack payment for order ${order.id}`,
        metadata: { gateway: 'paystack', reference, gatewayResponse: verified.raw },
      });

      order.status = OrderStatus.PROCESSING;
      order.isPaid = true;
      order.paidAt = new Date();
      order.gatewayResponse = verified.raw;
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      this.logger.log(`Paystack payment finalized for order ${order.id}`);

      return this.findOne(order.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to finalize Paystack payment:', error);
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
    const { page = 1, limit = 10, status, search, userId, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.user', 'user');

    if (status) {
      queryBuilder.where('order.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('order.userId = :userId', { userId });
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

    // Paystack refund is called outside the DB transaction below - never hold a
    // DB connection open across an external HTTP call.
    let paystackRefundRequested = false;

    if (
      order.isPaid &&
      order.paymentMethod !== PaymentMethod.WALLET &&
      order.paymentReference
    ) {
      try {
        await this.paystackService.refundTransaction(order.paymentReference);
        paystackRefundRequested = true;
      } catch (error) {
        this.logger.error(`Failed to request Paystack refund for order ${id}:`, error);
        throw error;
      }
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
        if (order.paymentMethod === PaymentMethod.WALLET) {
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
        } else if (paystackRefundRequested) {
          // Paystack refunds are asynchronous - this logs the request as PENDING;
          // reconciling it to COMPLETED would need a `refund.processed` webhook
          // handler, which is a known follow-up, not implemented here.
          const wallet = await queryRunner.manager.findOne(Wallet, {
            where: { userId },
          });

          if (wallet) {
            await queryRunner.manager.save(
              Transaction,
              queryRunner.manager.create(Transaction, {
                walletId: wallet.id,
                userId,
                type: TransactionType.REFUND,
                amount: Number(order.total),
                status: TransactionStatus.PENDING,
                description: `Paystack refund requested for cancelled order ${id}`,
                referenceId: order.id,
                referenceType: 'order',
                metadata: { gateway: 'paystack', reference: order.paymentReference },
              }),
            );
          }

          this.logger.log(`Paystack refund requested for cancelled order ${id}`);
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
