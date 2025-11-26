import { Controller, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post()
  async createReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewService.createReview(req.user.id, createReviewDto);
  }

  @Patch(':id')
  async updateReview(
    @Request() req,
    @Param('id') reviewId: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewService.updateReview(req.user.id, reviewId, updateReviewDto);
  }

  @Delete(':id')
  async deleteReview(@Request() req, @Param('id') reviewId: string) {
    return this.reviewService.deleteReview(req.user.id, reviewId);
  }
}