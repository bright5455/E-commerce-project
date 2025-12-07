import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Review } from '../../review/entity/review.entity';
import { Cart } from '../../cart/entity/cart.entity';
import { User } from '../../user/entity/user.entity';

@Entity('products')
@Check(`"stock" >= 0`)
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Index()
  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Review, review => review.product)
  reviews: Review[];

  @OneToMany(() => Cart, cart => cart.product)
  cartItems: Cart[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;


}