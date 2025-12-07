import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}


  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all reviews for a product with pagination' })
  @ApiResponse({ status: 200, description: 'Product reviews retrieved successfully' })
  async findAllByProduct(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    return this.reviewService.findAllByProduct(productId, {
      page,
      limit,
      sortBy,
      order,
    });
  }

  @Get('product/:productId/rating')
  @ApiOperation({ summary: 'Get average rating for a product' })
  @ApiResponse({ status: 200, description: 'Product rating retrieved successfully' })
  async getProductRating(@Param('productId') productId: string) {
    return this.reviewService.getProductRating(productId);
  }

  @Get('user/my-reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reviews by current user' })
  @ApiResponse({ status: 200, description: 'User reviews retrieved successfully' })
  async findAllByUser(@Request() req) {
    return this.reviewService.findAllByUser(req.user.id);
  }

  @Get('product/:productId/can-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can review a product' })
  @ApiResponse({ status: 200, description: 'Review eligibility checked' })
  async canUserReview(@Request() req, @Param('productId') productId: string) {
    const canReview = await this.reviewService.canUserReview(req.user.id, productId);
    return {
      canReview,
      message: canReview
        ? 'You can review this product'
        : 'You must purchase this product before reviewing or you have already reviewed it',
    };
  }

  @Post('product/:productId')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a product' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  async create(
    @Request() req,
    @Param('productId') productId: string,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewService.create(req.user.id, productId, createReviewDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own review' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewService.update(id, req.user.id, updateReviewDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own review' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.reviewService.remove(id, req.user.id);
  }
}