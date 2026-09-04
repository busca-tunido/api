import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ReviewsService } from './reviews.service.js';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('pensions/:pensionId/reviews')
  @ApiOperation({ summary: 'Get all reviews for a pension' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  async findByPension(@Param('pensionId') pensionId: string): Promise<unknown[]> {
    return this.reviewsService.findByPension(pensionId);
  }

  @Post('pensions/:pensionId/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a review for a pension (Authenticated students)' })
  @ApiResponse({ status: 201, description: 'Review posted successfully' })
  @ApiResponse({ status: 409, description: 'Already reviewed this pension' })
  async create(
    @Param('pensionId') pensionId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: SanitizedUser,
  ): Promise<unknown> {
    return this.reviewsService.create(pensionId, dto, user);
  }

  @Patch('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update your review (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: SanitizedUser,
  ): Promise<unknown> {
    return this.reviewsService.update(id, dto, user);
  }

  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete your review (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ id: string; deleted: boolean }> {
    return this.reviewsService.delete(id, user);
  }
}
