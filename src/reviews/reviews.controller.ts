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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import { DeleteResultResponseDto } from '../pensions/dto/pension-response.dto.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { FilterReviewsDto } from './dto/filter-reviews.dto.js';
import {
  HelpfulVotesResponseDto,
  PaginatedReviewsResponseDto,
  ReviewResponseDto,
  StudentStayResponseDto,
  VoteHelpfulResultResponseDto,
} from './dto/review-response.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { type PaginatedReviews, ReviewsService } from './reviews.service.js';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('pensions/:pensionId/reviews')
  @ApiOperation({
    summary: 'Get paginated reviews for a pension with optional rating filter and sorting',
  })
  @ApiParam({ name: 'pensionId', type: String, description: 'ID de la pensión' })
  @ApiEnvelopeResponse(PaginatedReviewsResponseDto, {
    status: 200,
    description: 'Paginated reviews response',
  })
  @ApiStandardErrors([400, 404, 500])
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
  @ApiEnvelopeResponse(StudentStayResponseDto, {
    status: 200,
    isArray: true,
    description: 'List of student stays',
  })
  @ApiStandardErrors([401, 500])
  async findUserStays(@CurrentUser() user: SanitizedUser): Promise<unknown[]> {
    return this.reviewsService.findUserStays(user.id);
  }

  @Post('pensions/:pensionId/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a review for a pension (Authenticated students)' })
  @ApiParam({ name: 'pensionId', type: String, description: 'ID de la pensión' })
  @ApiEnvelopeResponse(ReviewResponseDto, {
    status: 201,
    description: 'Review posted successfully',
  })
  @ApiStandardErrors([400, 401, 409, 500])
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
  @ApiParam({ name: 'id', type: String, description: 'ID de la reseña' })
  @ApiEnvelopeResponse(ReviewResponseDto, {
    status: 200,
    description: 'Review updated successfully',
  })
  @ApiStandardErrors([400, 401, 403, 404, 500])
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
  @ApiParam({ name: 'id', type: String, description: 'ID de la reseña' })
  @ApiEnvelopeResponse(DeleteResultResponseDto, {
    status: 200,
    description: 'Review deleted successfully',
  })
  @ApiStandardErrors([401, 403, 404, 500])
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
  @ApiEnvelopeResponse(HelpfulVotesResponseDto, {
    status: 200,
    description: 'List of review IDs voted helpful',
  })
  @ApiStandardErrors([401, 500])
  async findUserHelpfulVotes(@CurrentUser() user: SanitizedUser): Promise<{ reviewIds: string[] }> {
    return this.reviewsService.findUserHelpfulVotes(user.id);
  }

  @Post('reviews/:id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote a review as helpful (toggle)' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la reseña' })
  @ApiEnvelopeResponse(VoteHelpfulResultResponseDto, {
    status: 200,
    description: 'Review vote toggled successfully',
  })
  @ApiStandardErrors([401, 404, 500])
  async voteHelpful(
    @Param('id') id: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ helpfulCount: number; voted: boolean }> {
    return this.reviewsService.voteHelpful(id, user.id);
  }
}
