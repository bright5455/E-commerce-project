import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from 'src/user/entity/user.entity';

// TODO: Create a proper interface for order items instead of using 'any'
// interface OrderItem {
//   productId: string;
//   productName: string;
//   quantity: number;
//   priceAtPurchase: number;
// }

// TODO: Consider creating an OrderItem entity with a proper relationship
// instead of storing items as JSON (better for querying and reporting)

// TODO: Add enum for order status instead of plain string
// export enum OrderStatus {
//   PENDING = 'pending',
//   CONFIRMED = 'confirmed',
//   SHIPPED = 'shipped',
//   DELIVERED = 'delivered',
//   CANCELLED = 'cancelled',
// }

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.orders, { onDelete: 'CASCADE' })
  user: User;

  @Index() // TODO: Add index for faster user order lookups
  @Column()
  userId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Index() // TODO: Add index for filtering orders by status
  @Column({ default: 'pending' })
  // TODO: Use enum type: @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: string;

  // FIXME: Avoid using 'any' type - create proper OrderItem interface
  @Column('jsonb')
  items: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}