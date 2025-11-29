import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Wallet } from 'src/wallet/entity/wallet.entity';

// TODO: Create enum for transaction types
// export enum TransactionType {
//   DEPOSIT = 'deposit',
//   WITHDRAWAL = 'withdrawal',
//   PURCHASE = 'purchase',
//   REFUND = 'refund',
//   TRANSFER_IN = 'transfer_in',
//   TRANSFER_OUT = 'transfer_out',
// }

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wallet, wallet => wallet.transactions, { onDelete: 'CASCADE' })
  wallet: Wallet;

  @Index() // For faster wallet transaction lookups
  @Column()
  walletId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  // TODO: Use enum type instead of string
  // @Column({ type: 'enum', enum: TransactionType })
  @Column()
  type: string; 

  @Column('text', { nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}