import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import { PensionItemResponseDto } from '../pensions/dto/pension-response.dto.js';
import { ReviewResponseDto } from '../reviews/dto/review-response.dto.js';
import { UpdatePensionStatusDto } from './dto/update-pension-status.dto.js';
import { UpdateReviewVisibilityDto } from './dto/update-review-visibility.dto.js';
import { ModerationService } from './moderation.service.js';

@ApiTags('Moderation')
@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MODERATOR, Role.ADMIN)
@ApiBearerAuth()
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Patch('reviews/:id/visibility')
  @ApiOperation({ summary: 'Hide or unhide a review (Moderator or Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la reseña' })
  @ApiEnvelopeResponse(ReviewResponseDto, {
    status: 200,
    description: 'Review visibility updated',
  })
  @ApiStandardErrors([400, 401, 403, 404, 500])
  async updateReviewVisibility(
    @Param('id') id: string,
    @Body() dto: UpdateReviewVisibilityDto,
    @CurrentUser() user: SanitizedUser,
  ): Promise<unknown> {
    return this.moderationService.updateReviewVisibility(id, dto, user);
  }

  @Patch('pensions/:id/status')
  @ApiOperation({
    summary: 'Update pension verification status or active flag (Moderator or Admin only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID de la pensión' })
  @ApiEnvelopeResponse(PensionItemResponseDto, {
    status: 200,
    description: 'Pension status updated',
  })
  @ApiStandardErrors([400, 401, 403, 404, 500])
  async updatePensionStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePensionStatusDto,
    @CurrentUser() user: SanitizedUser,
  ): Promise<unknown> {
    return this.moderationService.updatePensionStatus(id, dto, user);
  }
}
