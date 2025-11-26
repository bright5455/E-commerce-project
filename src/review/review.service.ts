import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entity/review.entity';
import { Product } from 'src/product/entity/product.entity';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async createReview(userId: string, createReviewDto: CreateReviewDto) {
    const product = await this.productRepository.findOne({
      where: { id: createReviewDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: { userId, productId: createReviewDto.productId },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this product');
    }

    const review = this.reviewRepository.create({
      userId,
      productId: createReviewDto.productId,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
    });

    await this.reviewRepository.save(review);

    return {
      message: 'Review created successfully',
      review,
    };
  }

  async updateReview(userId: string, reviewId: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, userId },
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

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, userId },
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