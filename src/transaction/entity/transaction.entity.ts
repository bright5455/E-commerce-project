import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from 'src/wallet/entity/wallet.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wallet, wallet => wallet.transactions, { onDelete: 'CASCADE' })
  wallet: Wallet;

  @Column()
  walletId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  type: string; 

  @Column('text', { nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}