import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn, 
  OneToMany,
  OneToOne
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Cart } from '../../cart/entity/cart.entity';
import { Order } from '../../order/entity/order.entity';
import { Review } from '../../review/entity/review.entity';
import { Wallet } from '../../wallet/entity/wallet.entity';

export enum UserRole {
  USER = 'user',
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Exclude()
  @Column({ nullable: true })
  emailVerificationToken: string;

  @Exclude()
  @Column({ nullable: true })
  resetPasswordToken: string;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date;

  
  @Column({ default: false })
  isTwoFactorEnabled: boolean;


  @Column({ type: 'json', nullable: true })
  twoFactorSecret: string | null;


  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Cart, cart => cart.user)
  cart: Cart[];

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @OneToMany(() => Review, review => review.user)
  reviews: Review[];

  @OneToOne(() => Wallet, wallet => wallet.user)
  wallet: Wallet;


  @Column({ type: 'text', nullable: true })
  avatarUrl?: string;

   @Column({ nullable: true })
  cloudinaryPublicId: string;

  
  isAdmin(): boolean {
    return [
      UserRole.SUPER_ADMIN, 
      UserRole.ADMIN, 
      UserRole.MODERATOR
    ].includes(this.role);
  }

  isSuperAdmin(): boolean {
    return this.role === UserRole.SUPER_ADMIN;
  }
}
