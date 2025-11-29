import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from 'src/review/review.controller';

@Module({
  providers: [ReviewService],
  controllers: [ReviewController]
})
export class ReviewModule {}
