import { Injectable } from '@nestjs/common';

// TODO: Implement ReviewService with the following methods:
// - create(userId, productId, createReviewDto): Create review (verify user purchased product)
// - findAllByProduct(productId, query): Get product reviews with pagination
// - findAllByUser(userId): Get user's reviews
// - update(id, userId, updateReviewDto): Update own review
// - remove(id, userId): Delete own review
// - getProductRating(productId): Calculate average rating
// - canUserReview(userId, productId): Check if user purchased and hasn't reviewed

@Injectable()
export class ReviewService {}