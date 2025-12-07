import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { OrderItem } from '../../order/entity/order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum PaymentMethod {
  WALLET = 'wallet',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingFee: number;

  
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.WALLET,
  })
  paymentMethod: PaymentMethod;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({nullable: true})
  shippingAddress: string;

  @Column({nullable: true})
  shippingCity: string;

  @Column({nullable: true})
  shippingState: string;

  @Column({nullable: true})
  shippingZipCode: string;

  @Column({nullable: true})
  shippingCountry: string;

  @Column({ nullable: true })
  phoneNumber: string;
  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  shippedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancellationReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
