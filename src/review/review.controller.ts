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
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';

@Controller('reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  
  @Post('product/:productId')
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req,
    @Param('productId') productId: string,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewService.create(req.user.id, productId, createReviewDto);
  }

  @Get('product/:productId')
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

  
  @Get('user/my-reviews')
  @UseGuards(JwtAuthGuard)
  async findAllByUser(@Request() req) {
    return this.reviewService.findAllByUser(req.user.id);
  }

  
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewService.update(id, req.user.id, updateReviewDto);
  }

  
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Request() req, @Param('id') id: string) {
    return this.reviewService.remove(id, req.user.id);
  }

  
  @Get('product/:productId/rating')
  async getProductRating(@Param('productId') productId: string) {
    return this.reviewService.getProductRating(productId);
  }

  
  @Get('product/:productId/can-review')
  @UseGuards(JwtAuthGuard)
  async canUserReview(@Request() req, @Param('productId') productId: string) {
    const canReview = await this.reviewService.canUserReview(req.user.id, productId);
    return {
      canReview,
      message: canReview 
        ? 'You can review this product' 
        : 'You must purchase this product before reviewing or you have already reviewed it',
    };
  }
}