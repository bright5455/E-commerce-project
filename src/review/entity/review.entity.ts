import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import { Product } from 'src/product/entity/product.entity';

// TODO: Add unique constraint to prevent multiple reviews from same user for same product
// @Unique(['userId', 'productId'])

@Entity('reviews')
// TODO: Uncomment to enforce one review per user per product
// @Unique(['userId', 'productId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.reviews, { onDelete: 'CASCADE' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => Product, product => product.reviews, { onDelete: 'CASCADE' })
  product: Product;

  @Index() // For fetching product reviews
  @Column()
  productId: string;

  // TODO: Add check constraint for rating range (1-5)
  // Or use class-validator in DTO: @Min(1) @Max(5)
  @Column({ type: 'int', default: 5 })
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}