import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from './entities/review.entity';
import { Product } from '../products/entities/product.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectRepository(Review)
        private readonly reviewRepository: Repository<Review>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
        const product = await this.productRepository.findOne({
            where: { id: createReviewDto.productId },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${createReviewDto.productId} not found`);
        }

        const existingReview = await this.reviewRepository.findOne({
            where: { userId, productId: createReviewDto.productId },
        });

        if (existingReview) {
            throw new BadRequestException('You have already reviewed this product');
        }

        const review = this.reviewRepository.create({
            ...createReviewDto,
            userId,
            status: ReviewStatus.PENDING,
        });

        const savedReview = await this.reviewRepository.save(review);

        // Update product rating and review count
        const productReviews = await this.reviewRepository.find({
            where: { productId: createReviewDto.productId, status: ReviewStatus.APPROVED },
        });

        const totalRating = productReviews.reduce((sum, review) => sum + review.rating, 0);
        product.rating = totalRating / (productReviews.length || 1);
        product.reviewCount = productReviews.length;

        await this.productRepository.save(product);

        return savedReview;
    }

    async findAll(filters: { productId?: string; status?: ReviewStatus } = {}): Promise<Review[]> {
        return this.reviewRepository.find({
            where: filters,
            order: { createdAt: 'DESC' },
            relations: ['user'],
        });
    }

    async findOne(id: string): Promise<Review> {
        const review = await this.reviewRepository.findOne({
            where: { id },
            relations: ['user'],
        });

        if (!review) {
            throw new NotFoundException(`Review with ID ${id} not found`);
        }

        return review;
    }

    async update(id: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
        const review = await this.findOne(id);
        const oldStatus = review.status;

        Object.assign(review, updateReviewDto);
        const updatedReview = await this.reviewRepository.save(review);

        // If status changed to/from APPROVED, update product rating
        if (oldStatus !== review.status &&
            (oldStatus === ReviewStatus.APPROVED || review.status === ReviewStatus.APPROVED)) {
            const productReviews = await this.reviewRepository.find({
                where: { productId: review.productId, status: ReviewStatus.APPROVED },
            });

            const product = await this.productRepository.findOne({
                where: { id: review.productId },
            });

            if (product) {
                const totalRating = productReviews.reduce((sum, rev) => sum + rev.rating, 0);
                product.rating = totalRating / (productReviews.length || 1);
                product.reviewCount = productReviews.length;
                await this.productRepository.save(product);
            }
        }

        return updatedReview;
    }

    async remove(id: string): Promise<void> {
        const review = await this.findOne(id);
        await this.reviewRepository.remove(review);

        // Update product rating
        const productReviews = await this.reviewRepository.find({
            where: { productId: review.productId, status: ReviewStatus.APPROVED },
        });

        const product = await this.productRepository.findOne({
            where: { id: review.productId },
        });

        if (product) {
            const totalRating = productReviews.reduce((sum, rev) => sum + rev.rating, 0);
            product.rating = totalRating / (productReviews.length || 1);
            product.reviewCount = productReviews.length;
            await this.productRepository.save(product);
        }
    }

    async voteHelpful(id: string): Promise<Review> {
        const review = await this.findOne(id);
        review.helpfulVotes += 1;
        return this.reviewRepository.save(review);
    }
} 