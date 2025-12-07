import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entity/review.entity';
import { Product } from '../product/entity/product.entity';
import { Order } from '../order/entity/order.entity';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async findAllByProduct(
    productId: string, 
    query: { 
      page?: number; 
      limit?: number; 
      sortBy?: string; 
      order?: 'ASC' | 'DESC' 
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const order = query.order || 'DESC';

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.productId = :productId', { productId })
      .orderBy(`review.${sortBy}`, order)
      .skip(skip)
      .take(limit);

    const [reviews, total] = await queryBuilder.getManyAndCount();

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllByUser(userId: string) {
    const reviews = await this.reviewRepository.find({
      where: { userId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });

    return {
      reviews,
      count: reviews.length,
    };
  }

  async getProductRating(productId: string): Promise<{ averageRating: number; totalReviews: number }> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'totalReviews')
      .where('review.productId = :productId', { productId })
      .getRawOne();

    return {
      averageRating: parseFloat(result.averageRating) || 0,
      totalReviews: parseInt(result.totalReviews) || 0,
    };
  }


  async canUserReview(userId: string, productId: string): Promise<boolean> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: ['completed', 'delivered', 'pending', 'processing']
      })
      .getOne();

    if (!order) {
      return false;
    }

    const orderItems = order.items as any[];
    const hasPurchased = orderItems.some((item: any) => item.productId === productId);

    if (!hasPurchased) {
      return false;
    }

    const existingReview = await this.reviewRepository.findOne({
      where: { userId, productId },
    });

    return !existingReview;
  }


  async create(userId: string, productId: string, createReviewDto: CreateReviewDto) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const hasPurchased = await this.canUserReview(userId, productId);

    if (!hasPurchased) {
      throw new ForbiddenException('You can only review products you have purchased');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: { userId, productId },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this product');
    }

    const review = this.reviewRepository.create({
      userId,
      productId,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
    });

    await this.reviewRepository.save(review);

    return {
      message: 'Review created successfully',
      review,
    };
  }

 

  async update(id: string, userId: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.reviewRepository.findOne({
      where: { id, userId },
    });

    if (!review) {
      throw new NotFoundException('Review not found or you do not have permission to update it');
    }

    if (updateReviewDto.rating !== undefined) {
      review.rating = updateReviewDto.rating;
    }

    if (updateReviewDto.comment !== undefined) {
      review.comment = updateReviewDto.comment;
    }

    await this.reviewRepository.save(review);

    return {
      message: 'Review updated successfully',
      review,
    };
  }

 

  async remove(id: string, userId: string) {
    const review = await this.reviewRepository.findOne({
      where: { id, userId },
    });

    if (!review) {
      throw new NotFoundException('Review not found or you do not have permission to delete it');
    }

    await this.reviewRepository.remove(review);

    return {
      message: 'Review deleted successfully',
    };
  }
}