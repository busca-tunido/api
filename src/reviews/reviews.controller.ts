import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { FilterReviewsDto } from './dto/filter-reviews.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { type PaginatedReviews, ReviewsService } from './reviews.service.js';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('pensions/:pensionId/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get paginated reviews for a pension with optional rating filter and sorting',
  })
  @ApiResponse({ status: 200, description: 'Paginated reviews response' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByPension(
    @Param('pensionId') pensionId: string,
    @Query() filter: FilterReviewsDto,
  ): Promise<PaginatedReviews> {
    return this.reviewsService.findByPension(pensionId, filter);
  }

  @Get('stays')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get stay history for current authenticated student based on their reviews',
  })
  @ApiResponse({ status: 200, description: 'List of student stays' })
  async findUserStays(@CurrentUser() user: SanitizedUser): Promise<unknown[]> {
    return this.reviewsService.findUserStays(user.id);
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

  @Get('reviews/helpful/voted')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List review IDs the current user has voted as helpful' })
  @ApiResponse({ status: 200, description: 'List of review IDs voted helpful' })
  async findUserHelpfulVotes(@CurrentUser() user: SanitizedUser): Promise<{ reviewIds: string[] }> {
    return this.reviewsService.findUserHelpfulVotes(user.id);
  }

  @Post('reviews/:id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote a review as helpful (toggle)' })
  @ApiResponse({ status: 200, description: 'Review vote toggled successfully' })
  async voteHelpful(
    @Param('id') id: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ helpfulCount: number; voted: boolean }> {
    return this.reviewsService.voteHelpful(id, user.id);
  }
}
