import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewService } from './review.service';
import { ReviewController } from 'src/review/review.controller';
import { Review } from './entity/review.entity';
import { Product } from '../product/entity/product.entity';
import { Order } from '../order/entity/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Product, Order]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}