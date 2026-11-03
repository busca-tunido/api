import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProposalStatus, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import { CreateProposalDto } from './dto/create-proposal.dto.js';
import { PaginatedProposalsResponseDto, ProposalResponseDto } from './dto/proposal-response.dto.js';
import { ReviewProposalDto } from './dto/review-proposal.dto.js';
import { ProposalsService } from './proposals.service.js';

@ApiTags('Proposals')
@Controller()
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post('pensions/:id/proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a change proposal for a pension listing' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la pensión' })
  @ApiEnvelopeResponse(ProposalResponseDto, {
    status: 201,
    description: 'Proposal submitted successfully',
  })
  @ApiStandardErrors([400, 401, 404, 500])
  async create(
    @Param('id') pensionId: string,
    @Body() dto: CreateProposalDto,
    @CurrentUser() user: SanitizedUser,
  ): Promise<unknown> {
    return this.proposalsService.create(pensionId, dto, user);
  }

  @Get('pensions/:id/proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get proposal history for a specific pension' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la pensión' })
  @ApiEnvelopeResponse(ProposalResponseDto, {
    status: 200,
    isArray: true,
    description: 'List of proposals',
  })
  @ApiStandardErrors([401, 500])
  async findByPension(@Param('id') pensionId: string): Promise<unknown[]> {
    return this.proposalsService.findByPension(pensionId);
  }

  @Get('moderation/proposals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List proposals for moderation review (Moderator or Admin only)' })
  @ApiQuery({ name: 'status', enum: ProposalStatus, enumName: 'ProposalStatus', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiEnvelopeResponse(PaginatedProposalsResponseDto, {
    status: 200,
    description: 'Paginated proposals for moderation',
  })
  @ApiStandardErrors([401, 403, 500])
  async findModerationProposals(
    @Query('status') status?: ProposalStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    const pageNum = page ? Number.parseInt(page, 10) : 1;
    const limitNum = limit ? Number.parseInt(limit, 10) : 20;
    return this.proposalsService.findModerationProposals(status, pageNum, limitNum);
  }

  @Get('moderation/proposals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect proposal diff and context (Moderator or Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la propuesta' })
  @ApiEnvelopeResponse(ProposalResponseDto, {
    status: 200,
    description: 'Proposal and diff against active pension',
  })
  @ApiStandardErrors([401, 403, 404, 500])
  async findProposalWithDiff(@Param('id') id: string): Promise<unknown> {
    return this.proposalsService.findProposalWithDiff(id);
  }

  @Patch('moderation/proposals/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR, Role.LANDLORD)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve, reject, or modify and merge proposal (Moderator, Admin, or Landlord)',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID de la propuesta' })
  @ApiEnvelopeResponse(ProposalResponseDto, {
    status: 200,
    description: 'Proposal reviewed and merged',
  })
  @ApiStandardErrors([400, 401, 403, 404, 500])
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewProposalDto,
    @CurrentUser() user: SanitizedUser,
  ): Promise<unknown> {
    return this.proposalsService.review(id, dto, user);
  }
}
