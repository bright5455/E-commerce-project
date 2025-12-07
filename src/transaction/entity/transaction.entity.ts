import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from '../../wallet/entity/wallet.entity';
import { User } from '../../user/entity/user.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  PAYMENT = 'payment',
  REFUND = 'refund',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  COMMISSION = 'commission',
  BONUS = 'bonus',
  PENALTY = 'penalty',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  walletId: string;

  @ManyToOne(() => Wallet, { eager: false })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 ,nullable: true})
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 ,nullable: true})
  balanceAfter: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  referenceId: string; 

  @Column({ nullable: true })
  referenceType: string; 

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; 

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
} 

