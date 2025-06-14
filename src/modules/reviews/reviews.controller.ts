import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Review, ReviewStatus } from './entities/review.entity';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new review' })
    @ApiResponse({ status: 201, description: 'Review created successfully', type: Review })
    create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
        return this.reviewsService.create(req.user.id, createReviewDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all reviews' })
    @ApiResponse({ status: 200, description: 'Returns all reviews', type: [Review] })
    @ApiQuery({ name: 'productId', required: false })
    @ApiQuery({ name: 'status', required: false, enum: ReviewStatus })
    findAll(@Query('productId') productId?: string, @Query('status') status?: ReviewStatus) {
        return this.reviewsService.findAll({ productId, status });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a review by ID' })
    @ApiResponse({ status: 200, description: 'Returns the review', type: Review })
    findOne(@Param('id') id: string) {
        return this.reviewsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a review' })
    @ApiResponse({ status: 200, description: 'Review updated successfully', type: Review })
    update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
        return this.reviewsService.update(id, updateReviewDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a review' })
    @ApiResponse({ status: 200, description: 'Review deleted successfully' })
    remove(@Param('id') id: string) {
        return this.reviewsService.remove(id);
    }

    @Post(':id/helpful')
    @ApiOperation({ summary: 'Mark a review as helpful' })
    @ApiResponse({ status: 200, description: 'Review marked as helpful', type: Review })
    voteHelpful(@Param('id') id: string) {
        return this.reviewsService.voteHelpful(id);
    }
} 