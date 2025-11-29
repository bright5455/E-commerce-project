import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Review } from 'src/review/entity/review.entity';
import { Cart } from 'src/cart/entity/cart.entity';

// TODO: Add Category entity and ManyToOne relationship
// TODO: Add ProductImage entity for multiple images (OneToMany)
// TODO: Add product variants (size, color, etc.) entity
// TODO: Add SKU (Stock Keeping Unit) field for inventory management
// TODO: Consider adding compareAtPrice for sale/discount display

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index() // For product search functionality
  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: 0 })
  // TODO: Add check constraint to prevent negative stock
  stock: number;

  // TODO: Change to support multiple images - create ProductImage entity
  @Column({ nullable: true })
  imageUrl: string;

  @Index() // For filtering active products
  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Review, review => review.product)
  reviews: Review[];

  @OneToMany(() => Cart, cart => cart.product)
  cartItems: Cart[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}